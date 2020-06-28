import { Sequelize } from 'sequelize';

import { StorageKey } from '@polkadot/types';
import { Codec } from '@polkadot/types/types';
import Scanner from '@open-web3/scanner';
import { Block } from "@open-web3/scanner/types";
import { Balance } from '@acala-network/types/interfaces/runtime';

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { CdpModel, initCdpModel } from '@acala-weaver/database-models';

import { collateralCurrencyIds } from './util';

interface CollateralParams {
    maximumTotalDebitValue: string;
    stabilityFee: string;
    liquidationRatio: string;
    liquidationPenalty: string;
    requiredCollateralRatio: string;
}

interface CdpData {
    id: string;

    currency: string;
    totalDebit: string;
    totalCollateral: string;
    debitExchangeRate: string;
    globalStabilityFee: string;
    collateralParams: CollateralParams;
    consts: unknown;

    createAtBlock: number;
    createAtBlockHash: string;
    createAt: number;
}

export class CdpService extends BaseService {
    private model = CdpModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initCdpModel(this.db);
    }

    async getCDPInfo(block: Block, currency: string): Promise<CdpData> {
        const { metadata, registry } = block.chainInfo;
        const totalDebitStorageKey = new StorageKey(registry, [metadata.query.loans.totalDebits, currency]);
        const totalCollateralStorageKey = new StorageKey(registry, [metadata.query.loans.totalCollaterals, currency]);
        const debitExchangeRateStorageKey = new StorageKey(registry, [metadata.query.cdpEngine.debitExchangeRate, currency]);
        const globalStabilityFeeStorageKey = new StorageKey(registry, metadata.query.cdpEngine.globalStabilityFee);
        const collateralParamsStorageKey = new StorageKey(registry, [metadata.query.cdpEngine.collateralParams, currency]);

        const totalDebit = await this.scanner.getStorageValue<Balance>(totalDebitStorageKey, { blockNumber: block.number });
        const totalCollateral = await this.scanner.getStorageValue<Balance>(totalCollateralStorageKey, { blockNumber: block.number });
        const debitExchangeRate = await this.scanner.getStorageValue<Balance>(debitExchangeRateStorageKey, { blockNumber: block.number });
        const globalStabilityFee = await this.scanner.getStorageValue<Balance>(globalStabilityFeeStorageKey, { blockNumber: block.number });
        const collateralParams = await this.scanner.getStorageValue<Codec>(collateralParamsStorageKey, { blockNumber: block.number });

        return {
            id: `${block.number}-${currency}`,
            currency,
            totalDebit: totalDebit.toString(),
            totalCollateral: totalCollateral.toString(),
            debitExchangeRate: debitExchangeRate.toString(),
            globalStabilityFee: globalStabilityFee.toString(),
            collateralParams: collateralParams.toJSON() as unknown as CollateralParams,
            consts: block.chainInfo.metadata.consts.cdpEngine as any,
            createAtBlock: block.number,
            createAtBlockHash: block.hash,
            createAt: block.timestamp
        };
    }

    async onSyncBlockSuccess(block: Block, config: HandlerConfig): Promise<void> {
        const data = await Promise.all(collateralCurrencyIds.map((currency) => this.getCDPInfo(block, currency)));

        await this.model.bulkCreate(data, {
            transaction: config.transition,
            updateOnDuplicate: ['id']
        });
    }
}

