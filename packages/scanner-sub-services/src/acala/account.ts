import { Sequelize } from 'sequelize';

import Scanner from '@open-web3/scanner';
import { Event, Block } from '@open-web3/scanner/types';

import { AccountModel, initAccountModel } from '@acala-weaver/database-models';
import { BaseService, HandlerConfig } from '@acala-weaver/types';

export class AccountService extends BaseService {
    private model = AccountModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initAccountModel(this.db);
    }

    async onEvent (event: Event, block: Block, config: HandlerConfig): Promise<void> {
        const { section, method, args } = event;

        if (section === 'system' && method === 'NewAccount') {
            await this.model.upsert({
                account: args[0],
                createAtBlock: block.number,
                createAt: block.timestamp
            }, { transaction: config.transition });
        }
    }
}