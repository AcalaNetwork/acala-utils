import { OracleModel } from '@acala-weaver/database-models';

import { Middleware } from 'chain-spider/src';

export const oracle: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp = block.events
            .filter((event) => event.section === 'oracle' && event.method === 'NewAccount')
            .map((event) => {
                const { args } = event;

                return {
                    id: `${block.hash}-${event.index}`,
                    index: event.index,
                    account: args[0],
                    currency: args[1][0][0],
                    amount: args[1][0][1],
                    createAtBlock: block.number,
                    createAt: block.timestamp
                };
            });

        await OracleModel.bulkCreate(temp, {
            updateOnDuplicate: ['id'],
            transaction: context.transaction
        });
    }

    await next();
}
