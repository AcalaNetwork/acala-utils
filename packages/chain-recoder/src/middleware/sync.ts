import { Sequelize } from 'sequelize';

import { SyncModel } from '@acala-weaver/database-models';
import { Middleware } from "@acala-weaver/chain-spider";

export const sync: Middleware = async (data, next, context) => {
    const transaction = await (context.db as Sequelize).transaction({ autocommit: false });

    // insert transition to context
    context.transaction = transaction;

    await next();

    try {
        await SyncModel.upsert({ blockNumber: data.blockNumber, status: true }, { transaction });
        await transaction.commit();
    } catch (error) {
        console.log(error);
        await SyncModel.upsert({ 'blockNumber': data.blockNumber, 'status': false });
        await transaction.rollback();

        throw error;
        // FIXME: error don't be catched by upper promise
        process.exit(1);
    }
}
