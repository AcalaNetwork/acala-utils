import { Model, DataTypes, Sequelize } from 'sequelize';

export class PriceModel extends Model {
    public id!: string;
    public currency!: string;
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
        currency: {
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
            type: DataTypes.DATE
        }
    }, {
        sequelize: db,
        tableName: 'price',
        timestamps: false
    });
}