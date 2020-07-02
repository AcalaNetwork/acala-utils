import { LoanModel } from '@acala-weaver/database-models';
import { Middleware } from '@acala-weaver/chain-spider';

export const loan: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;

        const temp = await Promise.all(block.events
            .filter((event) => event.section === 'loans' && event.method === 'PositionUpdated')
            .map((event) => {
                const { args } = event;
                return {
                    id: `${args[1]}-${args[0]}`,
                    currency: args[1],
                    account: args[0],
                    updateAtBlock: block.number,
                    updateAtBlockHash: block.hash,
                    updateAt: block.timestamp
                };
            })
        );

        await LoanModel.bulkCreate(temp, {
            updateOnDuplicate: ['id'],
            transaction: context.transaction
        });
    }

    await next();
}