import { AccountModel } from '@acala-weaver/database-models';
import { Middleware, eventsHandler } from '@acala-weaver/chain-spider';

export const account: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp: unknown[] = [];

        eventsHandler([
            {
                section: 'system',
                method: 'NewAccount',
                handler: (event) => {
                    temp.push({
                        account: event.args[0],
                        createAtBlock: block.number,
                        createAtBlockHash: block.hash,
                        createAt: block.timestamp
                    });
                }
            }
        ])(data.result.events);

        await AccountModel.bulkCreate(temp, {
            updateOnDuplicate: ['account'],
            transaction: context.transaction
        });
    }

    await next();
}