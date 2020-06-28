import { Model, DataTypes, Sequelize } from 'sequelize';

export class TransferModel extends Model {
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
        from: {
            type: DataTypes.STRING,
            unique: 'transfer'
        },
        to: {
            type: DataTypes.STRING,
            unique: 'transfer'
        },
        currency: {
            type: DataTypes.STRING,
            unique: 'transfer'
        },
        amount: {
            type: DataTypes.STRING,
            unique: 'transfer'
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