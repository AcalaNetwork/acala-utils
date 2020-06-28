import { Sequelize } from 'sequelize';

import Scanner from '@open-web3/scanner';
import { SubscribeBlock, Extrinsic } from '@open-web3/scanner/types';

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { ExtrinsicModel, initExtrinsicModel } from '@acala-weaver/database-models';

export class ExtrinsicService extends BaseService {
    private model = ExtrinsicModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initExtrinsicModel(this.db);
    }

    async onExtrinsic (extrinsic: Extrinsic, index: number, block: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        await this.model.upsert({
            blockHash: block.hash,
            blockNumber: block.number,
            index: index,
            signer: extrinsic.signer,
            hash: extrinsic.hash,
            section: extrinsic.section,
            method: extrinsic.method,
            args: extrinsic.args,
            bytes: extrinsic.bytes
        }, { transaction: config.transition });
    }
}
