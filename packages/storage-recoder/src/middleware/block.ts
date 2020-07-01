import * as Influx from "influx";
import { Middleware } from "@acala-weaver/chain-spider";

export const block: Middleware = async (data, next, context) => {
    if (data.result) {
        const { result } = data;

        // insert timestamp to context
        context.timestamp = Influx.toNanoDate(result.number === 0 ? '000000000000000000000' : result.timestamp + '000000');

        await (context.db as Influx.InfluxDB).writePoints([
            {
                measurement: "block",
                fields: {
                    blockHash: result.hash,
                    author: result.author,
                },
                tags: {
                    blockNumber: result.number.toString()
                },
                timestamp: context.timestamp
            },
        ]);
    }

    await next();
};
