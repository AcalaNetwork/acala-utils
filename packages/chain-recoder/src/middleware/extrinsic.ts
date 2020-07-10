import { ExtrinsicModel } from '@acala-weaver/database-models';
import { Middleware } from '@acala-weaver/chain-spider';

export const extrinsic: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;

        const temp = block.extrinsics.map((extrinsic, index) => {
            return {
                index: index,
                signer: extrinsic.signer,
                hash: extrinsic.hash,
                section: extrinsic.section,
                method: extrinsic.method,
                args: extrinsic.args,
                bytes: extrinsic.bytes,
                result: extrinsic.result,

                createAtBlock: block.number,
                createAtBlockHash: block.hash,
                createAt: block.timestamp
            };
        });

        await ExtrinsicModel.bulkCreate(temp, {
            updateOnDuplicate: ['hash'],
            transaction: context.transaction
        });
    }

    await next();
}
