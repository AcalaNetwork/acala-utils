import { BlockModel } from '@acala-weaver/database-models';
import { Middleware } from 'chain-spider/src';

export const block: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;

        await BlockModel.upsert({
            blockHash: block.hash,
            blockNumber: block.number,
            timestamp: block.timestamp,
            parentHash: block.raw.block.header.parentHash,
            author: block.author,
            raw: block.raw
        }, { transaction: context.transaction });
    }
    await next();
}