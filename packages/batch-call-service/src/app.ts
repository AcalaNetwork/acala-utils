import { ApiPromise } from '@polkadot/Api'
import { Sequelize } from 'sequelize'
import { autobind } from 'core-decorators'

import { logger } from './utils'
import { WebService } from './web-service'
import { init as modelInit } from './models'
import { Executor, SenderService } from './sender'

export interface ProxyServiceConfig {
    db: {
        url: string
    }
    api: ApiPromise
    web: {
        port?: number
    }
    executors: { uri?: string; mnemonic?: string; name: string; password: string }[]
}

export class ProxyService {
    #config!: ProxyServiceConfig
    #sequelize!: Sequelize
    #api!: ApiPromise
    #webService!: WebService
    #executor!: Executor
    #senderService!: SenderService

    constructor(config: ProxyServiceConfig) {
        this.#config = config
        this.#api = config.api
    }

    @autobind
    public async create() {
        try {
            await this.#api.connect
            // don't change the init order
            this.initExecutor()
            await this.initDB()

            await this.initWebService()
            await this.initSenderService()
        } catch (e) {
            logger.error('service initialize failed,', e)
        }
    }

    private async initSenderService() {
        this.#senderService = new SenderService({
            api: this.#api,
            executor: this.#executor,
        })

        await this.#senderService.start()
    }

    private async initWebService() {
        const webService = new WebService({
            port: this.#config.web.port || 3000,
            executorVerifyHandler: this.#executor.verify,
            sequelize: this.#sequelize
        })

        await webService.start()

        this.#webService = webService
    }

    private async initDB() {
        const sequelize = new Sequelize(this.#config.db.url, {
            dialect: 'postgres',
            logging: false,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            },
        })

        modelInit(sequelize)

        // test sequelzie connection
        await sequelize.authenticate()
        await sequelize.sync()

        this.#sequelize = sequelize
    }

    private initExecutor() {
        const executor = new Executor(this.#api)

        this.#config.executors.forEach((item) => {
            executor.add(item, item.name, item.password)
        })

        this.#executor = executor
    }
}
