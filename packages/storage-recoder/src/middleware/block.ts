import * as Influx from "influx";
import { Middleware } from "@acala-weaver/chain-spider";

const block: Middleware = async (data, next, context) => {
    await (context.db as Influx.InfluxDB).writePoints([
        {
            measurement: "block",
            fields: {
                blockHash: data.hash,
                author: data.author,
            },
            tags: { number: data.number.toString() },
            timestamp: data.timestamp + '0000',
        },
    ]);
    next();
};

export default block;
