import { options } from '@acala-network/api'
import { ApiPromise, WsProvider } from '@polkadot/api'

import { ProxyService } from '@acala-utils/batch-call-service'

import Config from './config'

async function start () {
    const config = await Config.create()

    const wsProvider = new WsProvider(config.acala.endpoint)
    const api = await ApiPromise.create(options({ provider: wsProvider }))

    const service = new ProxyService({
        api,
        db: config.db,
        web: config.web,
        executors: config.executors
    })

    await service.create()
}

start()