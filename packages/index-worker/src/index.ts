import init, { Block, Events, Extrinsic, DispatchableCall } from '@open-web3/indexer/models';
import { Sequelize } from 'sequelize';
import { Middleware, ResultData } from './type';
import compose from 'koa-compose';

interface WorkConfig {
    indexerDB: Sequelize;
}

class Worker {
    #indexerDB: Sequelize;
    #config: WorkConfig;
    #middlewares: Middleware[];

    constructor(config: WorkConfig) {
        this.#indexerDB = config.indexerDB;
        this.#middlewares = [];
        this.#config = config;
    }

    init () {
        // initialize indexer modle
        init(this.#indexerDB);
    }

    async fetchDataFromIndexer (blockNumber: number): Promise<ResultData> {
        const block = await Block.findOne({ where: { blockNumber } });
        const events = await Events.findAll({ where: { blockNumber } });
        const extrinsics = await Extrinsic.findAll({ where: { blockNumber } });
        const dispatchableCalls = await Extrinsic.findAll({ where: { blockNumber} });

        return {
            block,
            events,
            extrinsics,
            dispatchableCalls
        };
    }

    use (middleware: Middleware) {
        this.#middlewares.push(middleware);
    }

    handleSuccess (data: ResultData) {
        const _composed = compose(this.#middlewares);

        _composed({ data });
    }
};