import * as Influx from "influx";
import { Middleware } from "@acala-weaver/chain-spider";

export const extrinsic: Middleware = async (data, next, context) => {
    if (data.result) {
        const { result } = data;
        await (context.db as Influx.InfluxDB).writePoints(
            result.extrinsics.map((extrinsic) => {
                return {
                    measurement: "extrinsic",
                    fields: {
                        method: extrinsic.method,
                        section: extrinsic.section,
                        args: JSON.stringify(extrinsic.args),
                        signer: extrinsic.signer,
                        tip: extrinsic.tip,
                        nonce: extrinsic.nonce,
                    },
                    tags: {
                        blockNumber: result.number.toString(),
                        hash: result.hash
                    },
                    timestamp: context.timestamp
                };
            })
        );
    }

    await next();
};
