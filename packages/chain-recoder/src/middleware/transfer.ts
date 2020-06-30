import { TransferModel } from '@acala-weaver/database-models';

import { Middleware } from 'chain-spider/src';

export const transfer: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp = block.extrinsics
            .filter((extrinsic) => extrinsic.section === 'currencies' && extrinsic.method === 'transfer')
            .map((extrinsic) => {
                const { args } = extrinsic;

                return {
                    hash: extrinsic.hash,
                    from: extrinsic.signer,
                    to: args['dest'],
                    currency: args['currency_id'],
                    amount: args['amount'],
                    result: extrinsic.result,
                    createAtBlock: block.number,
                    createAtBlockHash: block.hash,
                    createAt: block.timestamp
                };
            });

        await TransferModel.bulkCreate(temp, {
            updateOnDuplicate: ['hash'],
            transaction: context.transaction
        });
    }

    await next();
}
