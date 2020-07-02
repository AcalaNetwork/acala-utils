import { AccountModel } from '@acala-weaver/database-models';

import { Middleware } from 'chain-spider/src';

export const account: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp = block.events
            .filter((event) => event.section === 'system' && event.method === 'NewAccount')
            .map((event) => {
                return {
                    account: event.args[0],
                    createAtBlock: block.number,
                    createAtBlockHash: block.hash,
                    createAt: block.timestamp
                };
            });

        await AccountModel.bulkCreate(temp, {
            updateOnDuplicate: ['account'],
            transaction: context.transaction
        });
    }

    await next();
}