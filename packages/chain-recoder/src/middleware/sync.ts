import { Sequelize } from 'sequelize';

import { SyncModel } from '@acala-weaver/database-models';
import { Middleware } from "@acala-weaver/chain-spider";

export const sync: Middleware = async (data, next, context) => {
    const transaction = await (context.db as Sequelize).transaction({ autocommit: false });

    // insert transition to context
    context.transaction = transaction;

    try {
        await next();
        await SyncModel.upsert({ blockNumber: data.blockNumber, status: true }, { transaction });
        await transaction.commit();
    } catch (error) {
        await SyncModel.upsert({ 'blockNumber': data.blockNumber, 'status': false });
        await transaction.rollback();
        throw error;
    }
}
