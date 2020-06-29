import { Sequelize } from 'sequelize';

import { StorageKey } from '@polkadot/types';
import Scanner from '@open-web3/scanner';
import { TimestampedValue, Balance } from '@open-web3/orml-types/interfaces';
import { SubscribeBlock } from '@open-web3/scanner/types';
import { calcCommunalBonded, calcCommunalTotal, calcLiquidExchangeRate, Fixed18, convertToFixed18 } from '@acala-network/app-util';

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
            let price = '';

            // get ldot price
            if (currency === 'LDOT') {
                const liquidTokenIssuanceKey = new StorageKey(registry, [metadata.query.tokens.totalIssuance, currency]);
                const totalBondedKey = new StorageKey(registry, metadata.query.stakingPool.totalBonded);
                const nextEraUnbondKey = new StorageKey(registry, metadata.query.stakingPool.nextEraUnbond);
                const freeKey = new StorageKey(registry, metadata.query.stakingPool.freeUnbonded);
                const unbondingToFreeKey = new StorageKey(registry, metadata.query.stakingPool.unbondingToFree);
                const dotPriceKey = new StorageKey(registry, [metadata.query.oracle.values, 'DOT']);

                const [dotPrice, liquidTokenIssuance, totalBonded, nextEraUnbond, free, unbondingToFree] = await Promise.all([
                    this.scanner.getStorageValue<TimestampedValue>(dotPriceKey, { blockNumber: block.number }),
                    this.scanner.getStorageValue<Balance>(liquidTokenIssuanceKey, { blockNumber: block.number }),
                    this.scanner.getStorageValue<Balance>(totalBondedKey, { blockNumber: block.number }),
                    this.scanner.getStorageValue<[Balance, Balance]>(nextEraUnbondKey, { blockNumber: block.number }),
                    this.scanner.getStorageValue<Balance>(freeKey, { blockNumber: block.number }),
                    this.scanner.getStorageValue<Balance>(unbondingToFreeKey, { blockNumber: block.number })
                ]);

                const communalBonded = calcCommunalBonded(convertToFixed18(totalBonded), convertToFixed18(nextEraUnbond[1]));
                const communalTotal = calcCommunalTotal(communalBonded, convertToFixed18(free), convertToFixed18(unbondingToFree));
                const exchangeRate = calcLiquidExchangeRate(
                    convertToFixed18(liquidTokenIssuance),
                    communalTotal,
                    convertToFixed18(block.chainInfo.metadata.consts.stakingPool.defaultExchangeRate)
                );
                const _dotPrice = convertToFixed18(dotPrice.isEmpty ? 0 : dotPrice.value);
                const result = _dotPrice.mul(exchangeRate);

                price = result.toString();
            } else {
                // normal asset price
                const storageKey = new StorageKey(registry, [metadata.query.oracle.values, currency]);
                const result = await this.scanner.getStorageValue<TimestampedValue>(storageKey, { blockNumber: block.number });

                price = result.isEmpty ? '0' : result.value.toString();
            }

            return {
                id: `${block.hash}-${currency}`,
                currency,
                amount: price,
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
