import express, { RequestHandler } from 'express'
import { Job, Transition } from '../../models'
import type { TransitionCreationAttributes } from '../../models'
import { Sequelize } from 'sequelize/types'

type TransitionParams = {
    method: string
    section: string
    params: any[]
}[]

const paramsValidator: RequestHandler = (req, res, next) => {
    const { executor, signature, transitions } = req.body as {
        executor: string
        signature: string
        transitions: TransitionParams
    }

    if (!executor || !signature || !transitions) {
        res.status(400).json({
            code: 20001,
            message: 'invalid params. executor, message, signature, transitions is requried',
        })

        return
    }

    const errorIndex = transitions.findIndex(
        (item) => !item.method || !item.section || !item.params || !Array.isArray(item.params)
    )

    if (errorIndex !== -1) {
        res.status(400).json({
            code: 20002,
            message: `invalid params. at transitons#${errorIndex}`,
        })

        return
    } else {
        next()
    }
}

export const getTransitionRouter = (executorValidator: RequestHandler, sequelize: Sequelize) => {
    const transitionRouter = express.Router()

    transitionRouter.post('/', paramsValidator, executorValidator, async (req, res) => {
        const transition = await sequelize.transaction();

        try {
            const { executor, transitions, sudo } = req.body as { executor: string; transitions: TransitionParams; sudo?: boolean }

            const job = await Job.create({
                sudo,
                executor,
                status: 'creating',
            })

            const _transitions = transitions.map((item) => {
                return {
                    ...item,
                    jobId: job.get('id'),
                    status: 'created',
                }
            }) as TransitionCreationAttributes[]

            await Transition.bulkCreate(_transitions)

            await Job.update({
                status: 'created'
            }, {
                where: { id: job.get('id') }
            });

            await transition.commit();

            res.status(200).json({
                message: 'create transition job success',
                data: {
                    id: job.get('id'),
                },
            })
        } catch (e) {
            await transition.rollback()
            res.status(500).json({
                code: 20003,
                message: `create transitions job failed, ${e}`,
            })
        }
    })

    return transitionRouter
}
