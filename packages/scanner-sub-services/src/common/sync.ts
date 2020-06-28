import { Sequelize, DataTypes, Model } from 'sequelize';

import Scanner from '@open-web3/scanner';
import { SubscribeBlock } from '@open-web3/scanner/types';

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { SyncModel, initSyncModel } from '@acala-weaver/database-models';

export class SyncService extends BaseService {
    private model = SyncModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initSyncModel(this.db);
    }

    async onSyncBlockSuccess (block: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        await this.model.upsert({ 'blockNumber': block.number, 'status': true }, { transaction: config.transition });
    }

    async onSyncBlockError (blockNum: number, config: HandlerConfig): Promise<void> {
        await this.model.upsert({ 'blockNumber': blockNum, 'status': false });
    }

    async getLatestBlockNumber (): Promise<number> {
        const result = await this.model.max('blockNumber');

        return Number(result) || 0;
    }
}
