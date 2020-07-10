import * as Influx from "influx";
import { Fixed18, convertToFixed18  } from '@acala-network/app-util';

import { Middleware } from "@acala-weaver/chain-spider";
import { getStorageValue } from "@acala-weaver/scan-storage-data";
import { Balance } from "@acala-network/types/interfaces";

// required price middleware
export const collateralAuction: Middleware = async (data, next, context) => {
    if (data.result && (data.blockNumber % context.gap) === 0) {
        const { result } = data;
        const assets = result.chainInfo.registry.createType('CurrencyId').defKeys;
        const collateralCurrencyIds = result.chainInfo.metadata.consts.cdpEngine.collateralCurrencyIds;
        const collateralAuctions = await Promise.all(
            collateralCurrencyIds.map((asset) => getStorageValue<Balance>('auctionManager.totalCollateralInAuction', result, context.scanner, [asset.toString()]))
        );

        await (context.db as Influx.InfluxDB).writePoints(
            collateralAuctions.map((balance, index) => {
                const _totalCollateral = convertToFixed18(balance);
                const asset = assets[index];
                const prices = context.prices.get(asset) || Fixed18.ZERO;
                const _totalValue = _totalCollateral.mul(prices);

                return {
                    measurement: 'collateral-auction',
                    fields: {
                        totalCollateral: _totalCollateral.toNumber(18, 3) || 0,
                        totalCollateralValue: _totalValue.toNumber(18, 3) || 0
                    },
                    tags: {
                        blockNumber: result.number.toString(),
                        asset: assets[index]
                    },
                    timestamp: context.timestamp
                };
            })
        );
    }

    await next();
};

export const debitAuction: Middleware = async (data, next, context) => {
    if (data.result && (data.blockNumber % context.gap) === 0) {
        const { result } = data;
        const [totalDebitInAuction, totalTargetInAuction] = await Promise.all([
            getStorageValue<Balance>('auctionManager.totalDebitInAuction', result, context.scanner),
            getStorageValue<Balance>('auctionManager.totalTargetInAuction', result, context.scanner),
        ]);
        const _totalDebitInAuction = convertToFixed18(totalDebitInAuction);
        const _totalTargetInAuction = convertToFixed18(totalTargetInAuction);

        await (context.db as Influx.InfluxDB).writePoints(
            [{
                measurement: 'debit-auction',
                fields: {
                    totalDebit: _totalDebitInAuction.toNumber(18, 3) || 0,
                    totalDebitValue: _totalDebitInAuction.toNumber(18, 3) || 0,
                    totalTarget: _totalTargetInAuction.toNumber(18, 3) || 0,
                    totalTargetValue: _totalTargetInAuction.toNumber(18, 3) || 0,
                },
                tags: {
                    blockNumber: result.number.toString(),
                },
                timestamp: context.timestamp
            }]
        );
    }

    await next();
};

export const surplusAuction: Middleware = async (data, next, context) => {
    if (data.result && (data.blockNumber % context.gap) === 0) {
        const { result } = data;
        const totalSurplusInAuction = await getStorageValue<Balance>('auctionManager.totalSurplusInAuction', result, context.scanner);
        const _totalSurplusInAuction = convertToFixed18(totalSurplusInAuction || 0);
        const price = context.prices.get('ACA') || Fixed18.ZERO;
        const totalSurplushValue = _totalSurplusInAuction.mul(price);

        await (context.db as Influx.InfluxDB).writePoints(
            [{
                measurement: 'surplus-auction',
                fields: {
                    totalSurplus: _totalSurplusInAuction.toNumber(18, 3) || 0.0,
                    totalSurplusValue: totalSurplushValue.toNumber(18, 3) || 0.0,
                },
                tags: {
                    blockNumber: result.number.toString(),
                },
                timestamp: context.timestamp
            }]
        );
    }

    await next();
};
