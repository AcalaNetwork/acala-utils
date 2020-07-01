import * as Influx from "influx";
import { Middleware } from "@acala-weaver/chain-spider";

export const event: Middleware = async (data, next, context) => {
    if (data.result) {
        const { result } = data;
        const temp = result.events.map((event) => {
            return {
                measurement: 'event',
                fields: {
                    index: event.index,
                    section: event.section,
                    method: event.method,
                    args1: JSON.stringify(event.args[0]),
                    args2: JSON.stringify(event.args[1]),
                    args3: JSON.stringify(event.args[2]),
                    args4: JSON.stringify(event.args[3]),
                    args5: JSON.stringify(event.args[4]),
                    args6: JSON.stringify(event.args[5]),
                    args: JSON.stringify(event.args)
                },
                tags: {
                    blockNumber: data.blockNumber.toString(),
                    index: event.index.toString()
                },
                timestamp: context.timestamp
            };
        });

        await (context.db as Influx.InfluxDB).writePoints(temp);
    }

    await next();
};
