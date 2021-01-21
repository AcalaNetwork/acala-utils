import { ApiPromise } from '@polkadot/api'
import { DispatchError } from '@polkadot/types/interfaces'
import { u32 } from '@polkadot/types'
import { ITuple, IEvent } from '@polkadot/types/types'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { autobind } from 'core-decorators'

import { Deferred, logger } from '../utils'
import { Job, Transition } from '../models'
import type { TransitionAttributes } from '../models'
import { Executor } from './executor'

interface SenderOptions {
    api: ApiPromise
    executor: Executor
}

export class SenderService {
    #api: ApiPromise
    #executor: Executor

    constructor(options: SenderOptions) {
        this.#api = options.api
        this.#executor = options.executor
    }

    @autobind
    public sendableCheck(section: string, method: string, params: any[], index: number = 0): boolean {
        try {
            this.#api.tx[section][method].apply(this.#api, params)
        } catch (e) {
            logger.error(`sendable check failed at ${index}:${section}:${method}:${JSON.stringify(params)}`)

            return false
        }

        return true
    }

    @autobind
    public buildBatchCall(
        tx: TransitionAttributes[],
        job: Job
    ): [
        SubmittableExtrinsic | null,
        (TransitionAttributes & { sendable: boolean })[],
        (TransitionAttributes & { sendable: boolean })[]
    ] {
        const _tx = []

        for (const item of tx) {
            _tx.push({
                ...item,
                sendable: this.sendableCheck(item.section, item.method, item.params),
            })
        }

        const sendable = _tx.filter((item) => item.sendable)

        if (sendable.length === 0) {
            return [null, [], _tx]
        }

        let call =  this.#api.tx.utility.batch(
            sendable.map((item) => {
                return this.#api.tx[item.section][item.method].apply(this.#api, item.params)
            })
        )

        if (job.get('sudo')) {
            call = this.#api.tx.sudo.sudo(call)
        }

        return [call, sendable, _tx.filter((item) => !item.sendable)]
    }

    @autobind
    public async start() {
        while (true) {
            const job = await this.getJob()

            if (!job) continue

            logger.info(`try job#${job.get('id')}`);

            const isSendable = await this.checkExecutorStatus(job)

            if (!isSendable) continue

            const transitions = await this.getTransitions(job.get('id'))

            if (transitions) {
                try {
                    await Transition.bulkCreate(
                        transitions.map(
                            (item) => ({
                                ...item.toJSON(),
                                status: 'locked'
                            })
                        ) as TransitionAttributes[],
                        { updateOnDuplicate: ['status'] }
                    )
                } catch (e) {
                    logger.error(`try lock transitions at ${job.get('id')} failed, ${e}`)

                    continue
                }

                const [call, sendableTxs, errroTxs] = this.buildBatchCall(
                    transitions.map((item) => item.toJSON()) as TransitionAttributes[],
                    job
                )

                if (errroTxs.length) {
                    try {
                        await Transition.bulkCreate(
                            errroTxs.map(
                                (item): TransitionAttributes => ({
                                    ...item,
                                    status: 'failed',
                                    reason: 'build tx error',
                                })
                            ),
                            { updateOnDuplicate: ['status', 'reason'] }
                        )
                    } catch (e) {
                        logger.error(`update transition record failed, ${e}`)

                        continue
                    }
                }

                if (call && sendableTxs) {
                    try {
                        logger.info(`execute job#${job.get('id')} start`)

                        const result = await this.send(call, job, sendableTxs)

                        if (!result) continue

                        const [hash, successIndex] = result

                        logger.info(`execute job#${job.get('id')} end at ${hash}`)

                        await Transition.bulkCreate(
                            sendableTxs.slice(0, successIndex).map(
                                (item, index) => ({
                                    ...item,
                                    txHash: hash,
                                    batchIndex: index,
                                    status: 'success',
                                })
                            ) as TransitionAttributes[],
                            { updateOnDuplicate: ['txHash', 'batchIndex', 'status'] }
                        )

                        if (successIndex !== sendableTxs.length) {
                            await Transition.bulkCreate(
                                sendableTxs
                                    .slice(0, successIndex)
                                    .map(
                                        (item, index) => ({
                                            ...item,
                                            txHash: hash,
                                            batchIndex: index,
                                            status: 'success',
                                        })
                                    )
                                    .concat(
                                        sendableTxs.slice(successIndex).map(
                                            (item, index) => ({
                                                ...item,
                                                txHash: hash,
                                                batchIndex: successIndex + index,
                                                status: 'failed',
                                                reason: 'batch interrupted',
                                            })
                                        )
                                    ) as TransitionAttributes[],
                                { updateOnDuplicate: ['txHash', 'batchIndex', 'status', 'reason'] }
                            )
                        }
                    } catch (e) {
                        // ingore error
                        logger.error(`execute error at ${job.get('id')}, ${e}`)

                        continue
                    }
                }

                const isComplated = await this.checkJobComplated(job.get('id'))

                await Job.update(
                    {
                        status: isComplated ? 'complated' : 'processing',
                    },
                    { where: { id: job.get('id') } }
                )
            }
        }
    }

    private async checkExecutorStatus(job: Job) {
        const name = job.get('executor')
        const sender = this.#executor.getExecutor(name)
        const pending = await this.#api.rpc.author.pendingExtrinsics()

        // ensure that sender is not empty
        if (!sender) return false

        for (const item of pending) {
            if (item.signer.toString() === sender.address) {
                return false
            }
        }

        return true
    }

    private async send(call: SubmittableExtrinsic, job: Job, tx: any[]) {
        const name = job.get('executor')
        const deferred = new Deferred<[string, number]>()
        const sender = this.#executor.getExecutor(name)

        if (!sender) return

        const extrinsics = await call.signAsync(sender)

        await extrinsics.send((result) => {
            if (result.isInBlock) {
                // check if interrupted
                const interruptedEvent = result.events
                    .filter(({ event }) => !event)
                    .filter(({ event: { section, method } }) => {
                        return section === 'utility' && method === 'BatchInterrupted'
                    })

                if (interruptedEvent.length) {
                    const { data } = (interruptedEvent[0].event as unknown) as IEvent<[u32, DispatchError]>

                    deferred.resolve([extrinsics.hash.toString(), Number(data[0].toString())])

                    return
                }

                deferred.resolve([extrinsics.hash.toString(), tx.length])
            }

            if (result.isError) {
                const errorEvent = result.events
                    .filter(({ event }) => !event)
                    .filter(({ event: { section, method } }) => {
                        return section === 'system' && method === 'ExtrinsicFailed'
                    })

                let msg = ''

                if (errorEvent.length) {
                    const [dispatchError] = (errorEvent[0].event as unknown) as ITuple<[DispatchError]>

                    if (dispatchError.isModule) {
                        try {
                            const error = this.#api.registry.findMetaError(
                                new Uint8Array([
                                    Number(dispatchError.asModule.index.toString()),
                                    Number(dispatchError.asModule.error.toString()),
                                ])
                            )

                            msg = `${error.section}.${error.method}.${error.name}`
                        } catch (e) {
                            msg = 'unknown error'
                        }
                    }
                }

                deferred.resolve([extrinsics.toHex(), 0])
            }
        })

        return deferred.promise
    }

    private async checkJobComplated(jobId: number) {
        const createdCount = await Transition.count({
            where: { jobId, status: 'created' },
        })

        return createdCount === 0
    }

    private async getJob() {
        const processing = await Job.findOne({
            where: { status: 'processing' },
        })

        if (processing) return processing

        const created = await Job.findOne({
            where: { status: 'created' },
            order: [['id', 'ASC']]
        })

        if (created) return created

        return null
    }

    private async getTransitions(jobId: number, limit = 100) {
        return Transition.findAll({
            where: { jobId, status: 'created' },
            limit,
        })
    }
}
