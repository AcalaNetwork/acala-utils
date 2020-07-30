import { Model, DataTypes, Sequelize } from 'sequelize';

export class PriceModel extends Model {
    public id!: string;
    public asset!: string;
    public amount!: string;
    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: number;
}

export function initPriceModel (db: Sequelize): Model {
    return PriceModel.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            unique: true
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
        tableName: 'price',
        timestamps: false,
        indexes: [
            { unique: false, fields: ['createAtBlock'] },
            { unique: false, fields: ['createAtBlockHash'] },
            { unique: false, fields: ['asset'] },
        ]
    });
}