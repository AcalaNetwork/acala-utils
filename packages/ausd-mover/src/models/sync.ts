import { Model, Sequelize, DataTypes } from 'sequelize';

export class AcalaSyncModel extends Model {
    public 'blockNumber': number;
    public 'status': boolean;
}

export function initAcalaSyncModel (db: Sequelize): Model {
    return AcalaSyncModel.init({
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
        tableName: 'acala-sync',
        indexes: [{ unique: true, fields: ['blockNumber'] }]
    });
}

export class LaminarSyncModel extends Model {
    public 'blockNumber': number;
    public 'status': boolean;
}

export function initLaminarSyncModel (db: Sequelize): Model {
    return LaminarSyncModel.init({
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
        tableName: 'laminar-sync',
        indexes: [{ unique: true, fields: ['blockNumber'] }]
    });
}