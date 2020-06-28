import { Sequelize, DataTypes } from 'sequelize';

import { StorageKey } from '@polkadot/types';
import Scanner from '@open-web3/scanner';
import { TimestampedValue } from '@open-web3/orml-types/interfaces';
import { SubscribeBlock } from '@open-web3/scanner/types';

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { PriceModel, initPriceModel } from '@acala-weaver/database-models';

import { currenciesId } from './util';

export class PriceService extends BaseService {
    private model = PriceModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initPriceModel(this.db);
    }

    async onSyncBlockSuccess(block: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        const data = await Promise.all(currenciesId.map(async (currency: string) => {
            const { metadata, registry } = block.chainInfo;
            const storageKey = new StorageKey(registry, [metadata.query.oracle.values, currency]);
            const result = await this.scanner.getStorageValue<TimestampedValue>(storageKey, { blockNumber: block.number });
            return {
                id: `${block.hash}-${currency}`,
                currency,
                amount: result.value.toString(),
                createAtBlock: block.number,
                createAtBlockHash: block.hash,
                createAt: block.timestamp
            };
        }));

        await this.model.bulkCreate(data, {
            transaction: config.transition,
            updateOnDuplicate: ['id']
        });
    }
}
