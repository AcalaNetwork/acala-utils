import { Sequelize, DataTypes, Model } from 'sequelize';

export class LoanModel extends Model {
    public currency!: string;
    public account!: string;
    public debit!: string;
    public collateral!: string;
    public createAtBlock!: number;
    public updateAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: number;
}

export function initLoanModel (db: Sequelize): Model {
    return LoanModel.init({
        currency: {
            type: DataTypes.STRING,
            unique: 'transfer'
        },
        account: {
            type: DataTypes.STRING,
            unique: 'transfer'
        },
        debit: {
            type: DataTypes.STRING,
            unique: 'transfer'
        },
        collateral: {
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
        },
        updateAtBlock: {
            type: DataTypes.BIGINT
        },
    }, {
        sequelize: db,
        tableName: 'loan',
        timestamps: false
    });
}