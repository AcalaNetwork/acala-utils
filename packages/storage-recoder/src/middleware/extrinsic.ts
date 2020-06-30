import * as Influx from "influx";
import { Middleware } from "@acala-weaver/chain-spider";

const middleware: Middleware = async (data, next, context) => {
    await (context.db as Influx.InfluxDB).writePoints(
        data.extrinsics.map((extrinsic) => {
            return {
                measurement: "extrinsic",
                fields: {
                    hash: extrinsic.hash,
                    method: extrinsic.method,
                    section: extrinsic.section,
                    args: JSON.stringify(extrinsic.args),
                    signer: extrinsic.signer,
                    tip: extrinsic.tip,
                    nonce: extrinsic.nonce,
                },
                tags: { blockNumber: data.number.toString() },
                timestamp: data.timestamp + '0000',
            };
        })
    );
    next();
};

export default middleware;
