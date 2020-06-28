import { Sequelize } from 'sequelize';

import Scanner from '@open-web3/scanner';
import { Event, Block } from '@open-web3/scanner/types';

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { OracleModel, initOracleModel } from '@acala-weaver/database-models';

export class OracleService extends BaseService {
    private model = OracleModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initOracleModel(this.db);
    }

    async onEvent (event: Event, block: Block, config: HandlerConfig): Promise<void> {
        const { section, method, args } = event;

        if (section === 'oracle' && method === 'NewFeedData') {
            await this.model.upsert({
                id: `${block.hash}-${event.index}`,
                index: event.index,
                account: args[0],
                currency: args[1][0][0],
                amount: args[1][0][1],
                createAtBlock: block.number,
                createAt: block.timestamp
            }, { transaction: config.transition });
        }
    }
}
