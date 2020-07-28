import { Sequelize, Model, DataTypes, UpsertOptions } from "sequelize/types"
import { SyncModel, initSyncModel } from "database-models/src";
import { ResultData } from "./type";

interface SyncManagerConfig {
    db: Sequelize;
    model: Model;
    concurrent: number;
}


class SyncManager {
    #db: Sequelize;
    #model: Model;

    constructor(config: SyncManagerConfig) {
        this.#db = config.db;
        this.#model = config.model;
    }

    async init (): Promise<void> {
        initSyncModel(this.#db);

        await this.#db.sync();
    }

    async getLatestSyncedBlock(): Promise<number> {
        const data = await SyncModel.max<number, SyncModel>('blockNumber');

        return data;
    }

    async writeSyncSuccess(blockNumber: number, options?: UpsertOptions): Promise<void> {
        await SyncModel.upsert({ blockNumber, status: true }, options);
    }

    async writeSyncFailure(blockNumber: number):  Promise<void> {
        await SyncModel.upsert({ blockNumber, status: false });
    }
    
    async start (callback: (data: ResultData) => void) {
        
    }
};