import { Sequelize } from 'sequelize';

import Scanner from '@open-web3/scanner';
import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { SubscribeBlock } from '@open-web3/scanner/types';
import { BlockModel, initBlockModel } from '@acala-weaver/database-models';

export class BlockService extends BaseService {
    private model = BlockModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initBlockModel(this.db);
    }

    async onSyncBlock (block: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        await this.model.upsert({
            blockHash: block.hash,
            blockNumber: block.number,
            timestamp: block.timestamp,
            parentHash: block.raw.block.header.parentHash,
            author: block.author,
            raw: block.raw
        }, { transaction: config.transition });
    }
}
