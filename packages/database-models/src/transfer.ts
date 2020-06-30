import { Model, DataTypes, Sequelize } from 'sequelize';

export class TransferModel extends Model {
    public hash!: string;
    public from!: string;
    public to!: string;
    public currency!: string;
    public amount!: string;
    public result!: string;
    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: number;
}

export function initTransferModel (db: Sequelize): Model {
    return TransferModel.init({
        hash: {
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true
        },
        from: {
            type: DataTypes.STRING
        },
        to: {
            type: DataTypes.STRING
        },
        currency: {
            type: DataTypes.STRING
        },
        amount: {
            type: DataTypes.STRING
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
        tableName: 'transfer',
        timestamps: false
    });
}