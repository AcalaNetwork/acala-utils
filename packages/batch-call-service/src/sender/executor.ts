import { ApiPromise } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { stringToU8a, hexToU8a } from '@polkadot/util'
import { autobind } from 'core-decorators'
import { Job } from '../models'

export class Executor {
    #keyring: Keyring
    #api: ApiPromise
    #password: Map<string, string>

    constructor(api: ApiPromise) {
        this.#keyring = new Keyring({ type: 'sr25519' })
        this.#api = api
        this.#password = new Map<string, string>()
    }

    @autobind
    public add(config: { mnemonic?: string; uri?: string; seed?: string }, name: string, password: string) {
        if (config.mnemonic) {
            this.#keyring.addFromMnemonic(config.mnemonic, { name })
        }

        if (config.uri) {
            this.#keyring.addFromUri(config.uri, { name })
        }

        if (config.seed) {
            this.#keyring.addFromSeed(stringToU8a(config.seed), { name })
        }

        this.#password.set(name, password)
    }

    @autobind
    public remove(name: string) {
        const executor = this.getExecutor(name)

        if (executor) {
            this.#keyring.removePair(executor.address)
        }
    }

    @autobind
    public getExecutor(name: string) {
        return this.#keyring.getPairs().find((item) => item.meta.name === name)
    }

    @autobind
    public async verify(name: string, signature: string): Promise<boolean> {
        const executor = this.getExecutor(name)

        if (!executor) throw new Error(`can't find executor ${name}`)

        const maxJobId = await Job.max('id')

        const token =
            process.env.NODE_ENV === 'development'
                ? `${this.#password.get(executor.meta.name as string)}`
                : `${this.#password.get(executor.meta.name as string)}#${(Number(maxJobId) || 0) + 1}`

        try {
            return executor.verify(stringToU8a(token), hexToU8a(signature))
        } catch (e) {
            return false
        }
    }
}
