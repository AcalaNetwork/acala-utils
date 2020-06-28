import { Model, Sequelize, DataTypes } from 'sequelize';

export class SyncModel extends Model {
    public 'blockNumber': number;
    public 'status': boolean;
}

export function initSyncModel (db: Sequelize): Model {
    return SyncModel.init({
        'blockNumber': {
            type: DataTypes.INTEGER,
            primaryKey: true,
            unique: true
        },
        'status': {
            type: DataTypes.BOOLEAN
        }
    }, {
        sequelize: db,
        tableName: 'sync',
        indexes: [{ unique: true, fields: ['blockNumber'] }]
    });
}
