import { LoanModel } from '@acala-weaver/database-models';
import { Middleware, eventsHandler } from '@acala-weaver/chain-spider';

export const loan: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp: unknown[] = [];

        eventsHandler([
            {
                section: 'loans',
                method: 'PositionUpdated',
                handler: (event) => {
                    const { args } = event;

                    temp.push({
                        id: `${args[1]}-${args[0]}`,
                        currency: args[1],
                        account: args[0],
                        updateAtBlock: block.number,
                        updateAtBlockHash: block.hash,
                        updateAt: block.timestamp
                    });
                }
            }
        ])(block.events);

        await LoanModel.bulkCreate(temp, {
            updateOnDuplicate: ['id'],
            transaction: context.transaction
        });
    }

    await next();
}