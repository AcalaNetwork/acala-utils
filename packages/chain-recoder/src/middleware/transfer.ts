import { TransferModel } from '@acala-weaver/database-models';

import { Middleware, extrinsicHandler } from '@acala-weaver/chain-spider';

export const transfer: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp: unknown[] = [];

        extrinsicHandler([
            {
                section: 'currencies',
                method: 'transfer',
                handler: (extrinsic) => {
                    const { args } = extrinsic;

                    temp.push({
                        hash: extrinsic.hash,
                        from: extrinsic.signer,
                        to: args['dest'],
                        asset: args['currency_id'],
                        amount: args['amount'],
                        result: extrinsic.result,

                        createAtBlock: block.number,
                        createAtBlockHash: block.hash,
                        createAt: block.timestamp
                    });
                }
            }
        ])(block.extrinsics);

        await TransferModel.bulkCreate(temp, {
            updateOnDuplicate: ['hash'],
            transaction: context.transaction
        });
    }

    await next();
}
