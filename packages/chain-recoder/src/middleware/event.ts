import { Middleware } from '@acala-weaver/chain-spider';
import { EventModel } from '@acala-weaver/database-models';

export const event: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;

        const temp = block.events.map((event) => {
            return {
                id: `${block.number}-${event.index}`,
                index: event.index,
                section: event.section,
                method: event.method,
                args: event.args,
                phaseType: event.phaseType,
                phaseIndex: event.phaseIndex,
            
                createAtBlock: block.number,
                createAtBlockHash: block.hash,
                createAt: block.timestamp
            };
        });

        await EventModel.bulkCreate(temp, {
            updateOnDuplicate: ['id'],
            transaction: context.transaction
        });
    }

    await next();
}