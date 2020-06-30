import { ExtrinsicModel } from '@acala-weaver/database-models';
import { Middleware } from 'chain-spider/src';

export const extrinsic: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp = block.extrinsics.map((extrinsic, index) => {
            return {
                blockHash: block.hash,
                blockNumber: block.number,
                index: index,
                signer: extrinsic.signer,
                hash: extrinsic.hash,
                section: extrinsic.section,
                method: extrinsic.method,
                args: extrinsic.args,
                bytes: extrinsic.bytes
            };
        });
        await ExtrinsicModel.bulkCreate(temp, {
            updateOnDuplicate: ['hash'],
            transaction: context.transaction
        });
    }
    await next();
}
