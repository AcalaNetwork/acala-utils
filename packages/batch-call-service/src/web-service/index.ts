import express, { Express, RequestHandler } from 'express'
import http from 'http'
import bodyParser from 'body-parser'

import { Deferred, logger } from '../utils'
import { getTransitionRouter } from './controllers'
import { Sequelize } from 'sequelize/types'

interface WebServiceConfig {
    port: number
    executorVerifyHandler: (name: string, signature: string) => Promise<boolean>,
    sequelize: Sequelize
}

class WebService {
    #app!: Express
    #config: WebServiceConfig

    constructor(config: WebServiceConfig) {
        this.#config = config
    }

    async start() {
        this.#app = express()

        const server = http.createServer(this.#app)

        const deferred = new Deferred()

        this.initMiddlewares()
        this.initRouters()

        server.listen(this.#config.port, () => {
            deferred.resolve()

            logger.info(`api server start at ${this.#config.port}`)
        })

        return deferred.promise
    }

    private initRouters() {
        this.#app.use('/transition', getTransitionRouter(this.executorVerifyMiddleware, this.#config.sequelize))
    }

    private initMiddlewares() {
        // parse body
        this.#app.use(bodyParser.json())

        // handle parse error
        this.#app.use((error: any, req: any, res: any, next: any) => {
            if (error instanceof SyntaxError) {
                res.status(500)
                res.json({
                    code: 1001,
                    message: 'parse body failed',
                })
            }

            next()
        })
    }

    private executorVerifyMiddleware: RequestHandler = async (req, res, next) => {
        const { executor, signature } = req.body

        const status = await this.#config.executorVerifyHandler(executor, signature)

        if (!status) {
            res.status(500).json({
                code: 1003,
                message: `verify with ${executor} failued`,
            })

            return
        }

        next()
    }
}

export { WebService }
