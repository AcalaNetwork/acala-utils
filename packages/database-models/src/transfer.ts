import { Model, DataTypes, Sequelize } from 'sequelize';

export class TransferModel extends Model {
    public hash!: string;
    public from!: string;
    public to!: string;
    public asset!: string;
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
        asset: {
            type: DataTypes.STRING
        },
        amount: {
            type: DataTypes.STRING
        },
        result: {
            type: DataTypes.STRING
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
        tableName: 'transfer',
        timestamps: false,
        indexes: [
            { unique: false, fields: ['from'] },
            { unique: false, fields: ['to'] },
            { unique: false, fields: ['asset'] },
        ]
    });
}