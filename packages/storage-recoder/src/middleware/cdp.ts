import * as Influx from "influx";
import { Fixed18  } from '@acala-network/app-util';

import { Middleware } from "@acala-weaver/chain-spider";
import { getCDP } from "@acala-weaver/scan-storage-data";

// required price middleware
export const cdp: Middleware = async (data, next, context) => {
    if (data.result && (data.blockNumber % context.gap) === 0) {
        const { result } = data;
        const assets = result.chainInfo.registry.createType('CurrencyId').defKeys;
        const collateralCurrencyIds = result.chainInfo.metadata.consts.cdpEngine.collateralCurrencyIds;
        const cdps = await Promise.all(
            collateralCurrencyIds.map((asset) => getCDP(asset.toString(), result, context.scanner))
        );

        await (context.db as Influx.InfluxDB).writePoints(
            cdps.map((item, index) => {
                let collateralRatio = Fixed18.ZERO;
                const collateralAmount = item.totalCollateral.mul(context.prices.get(item.asset));
                const debitAmount = item.totalDebit.mul(item.debitExchangeRate);
                if (context.prices) {
                    collateralRatio = collateralAmount.div(debitAmount);
                }
                return {
                    measurement: 'cdp',
                    fields: {
                        totalDebit: item.totalDebit.toNumber(18, 3) || 0,
                        totalCollateral: item.totalCollateral.toNumber(18, 3) || 0,
                        collateralAmount: collateralAmount.toNumber(18, 3) || 0,
                        debitAmount: debitAmount.toNumber(18, 3) || 0,
                        collateralRatio: collateralRatio.toNumber(18, 3) || 0,
                        debitExchangeRate: item.debitExchangeRate.toNumber(18, 3) || 0,
                        maximumTotalDebitValue: item.maximumTotalDebitValue.toNumber(18, 3) || 0,
                        minimumDebitValue: item.minimumDebitValue.toNumber(18, 3) || 0,
                        stabilityFee: item.stabilityFee.toNumber(18, 3) || 0,
                        liquidationRatio: item.liquidationRatio.toNumber(18, 3) || 0,
                        liquidationPenalty: item.liquidationPenalty.toNumber(18, 3) || 0,
                        requiredCollateralRatio: item.requiredCollateralRatio.toNumber(18, 3) || 0,
                        stableFeeAPR: item.stableFeeAPR.toNumber(18, 3) || 0
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
