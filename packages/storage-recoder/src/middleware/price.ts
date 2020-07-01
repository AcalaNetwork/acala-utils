import * as Influx from "influx";
import { Fixed18  } from '@acala-network/app-util';

import { Middleware } from "@acala-weaver/chain-spider";
import { getAssetPrice } from "@acala-weaver/scan-storage-data";

export const price: Middleware = async (data, next, context) => {
    if (data.result && (data.blockNumber % context.gap) === 0) {
        const { result } = data;
        const assets = result.chainInfo.registry.createType('CurrencyId').defKeys;
        const prices = await Promise.all(assets.map((asset) => getAssetPrice(asset, result, context.scanner)));

        // insert prices to ccontext for other middleware
        context.prices = prices.reduce((pre, cur, index) => {
            pre.set(assets[index], cur);

            return pre;
        }, new Map<string, Fixed18>());

        await (context.db as Influx.InfluxDB).writePoints(
            prices.map((item, index) => {
                return {
                    measurement: 'price',
                    fields: {
                        price: item.toNumber(18, 3) || 0
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
