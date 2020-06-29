import { Sequelize } from 'sequelize';

import Scanner from '@open-web3/scanner';
import { SubscribeBlock, Extrinsic } from "@open-web3/scanner/types";

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { TransferModel, initTransferModel } from '@acala-weaver/database-models';

export class TransferService extends BaseService {
    private model = TransferModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initTransferModel(this.db);
    }

    async onExtrinsic(extrinsic: Extrinsic, index: number, block: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        const { section, method, args } = extrinsic;

        if (section === 'currencies' && method === 'transfer') {
            await this.model.upsert({
                from: extrinsic.signer,
                to: args['dest'],
                currency: args['currency_id'],
                amount: args['amount'],
                result: extrinsic.result,
                createAtBlock: block.number,
                createAtBlockHash: block.hash,
                createAt: block.timestamp
            }, { transaction: config.transition });
        }
    }
}
