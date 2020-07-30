import { Model, DataTypes, Sequelize } from 'sequelize';

export class OracleModel extends Model {
    public id!: string;

    public eventIndex!: number;
    public address!: string;
    public asset!: string;
    public amount!: string;

    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: number;
}

export function initOracleModel (db: Sequelize): Model {
    return OracleModel.init({
        id: {
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true
        },
        eventIndex: {
            type: DataTypes.INTEGER
        },
        address: {
            type: DataTypes.STRING,
        },
        asset: {
            type: DataTypes.STRING,
        },
        amount: {
            type: DataTypes.STRING,
        },

        createAtBlock: {
            type: DataTypes.BIGINT
        },
        createAtBlockHash: {
            type: DataTypes.STRING
        },
        createAt: {
            type: DataTypes.STRING
        }
    }, {
        sequelize: db,
        tableName: 'oracle',
        timestamps: false,
        indexes: [
            { unique: false, fields: ['createAtBlock'] },
            { unique: false, fields: ['createAtBlockHash'] },
            { unique: false, fields: ['asset', 'address'] }
        ]
    });
}
