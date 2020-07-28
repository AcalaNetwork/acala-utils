import { SpiderController, SyncResult } from './types';
import { Sequelize, Transaction } from 'sequelize/types';
import initModels, { Block, Events, Extrinsic, } from '@open-web3/indexer/models'
import { initSyncModel, SyncModel } from '@acala-weaver/database-models';

interface ControllerConfig {
    indexerUri: string;
    controllerUri: string;
    initCursor?: number;
}

export class Controller implements SpiderController {
    #indexer!: Sequelize;
    #controller!: Sequelize;
    #cursor!: number;

    constructor(config: ControllerConfig) {
        this.#indexer= new Sequelize(config.indexerUri, {
            logging: false,
            pool: { acquire: 200000, }
        });
        this.#controller = new Sequelize(config.indexerUri, {
            logging: false,
            pool: { acquire: 200000, }
        });
        this.#cursor = config.initCursor || 0;
    }

    async init (): Promise<void> {
        /* eslint-disable-next-line */
        // @ts-ignore
        initModels(this.#indexer);
        await this.#indexer.sync();
        initSyncModel(this.#controller);
        await this.#controller.sync();

        // set cursor from controller
        const latestSyncBlockNumber = await SyncModel.max('blockNumber');
        if (latestSyncBlockNumber) {
            this.#cursor = Number(latestSyncBlockNumber);
        }
    }

    async onSyncSuccess(): Promise<SyncResult> {
        const block = await Block.findOne({
            where: {
                blockNumber: this.#cursor
            }
        });
        const events = await Events.findAll({
            where: {
                blockNumber: this.#cursor
            }
        });
        const extrinsics = await Extrinsic.findAll({
            where: {
                blockNumnber: this.#cursor
            }
        });

        return {
            ...block,
            events,
            extrinsics
        };
    }

    async onSuccess(blockNumber: number, transaction?: Transaction): Promise<void> {
        await SyncModel.upsert({ blockNumber: blockNumber, status: true }, { transaction });
    }

    async onFailure(blockNumber: number): Promise<void> {
        await SyncModel.upsert({ blockNumber: blockNumber, status: false });
    }
}
