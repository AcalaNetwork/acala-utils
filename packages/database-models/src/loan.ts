import { Sequelize, DataTypes, Model } from 'sequelize';

export class LoanModel extends Model {
    public id!: string;
    public asset!: string;
    public address!: string;

    public debit!: number;
    public collateral!: number;

    public debitlValue!: number;
    public collateralValue!: number;
    public collateralRatio!: number;

    public updateAtBlock!: number;
    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: number;
}

export function initLoanModel (db: Sequelize): Model {
    return LoanModel.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            unique: true
        },
        asset: {
            type: DataTypes.STRING,
            allowNull: false
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false
        },

        debit: {
            type: DataTypes.FLOAT,
        },
        collateral: {
            type: DataTypes.FLOAT,
        },

        debitlValue: {
            type: DataTypes.FLOAT,
        },
        collateralValue: {
            type: DataTypes.FLOAT,
        },
        collateralRatio: {
            type: DataTypes.FLOAT,
        },

        updateAtBlock: {
            type: DataTypes.BIGINT
        },
        createAtBlock: {
            type: DataTypes.BIGINT
        },
        createAtBlockHash: {
            type: DataTypes.STRING
        },
        createAt: {
            type: DataTypes.STRING
        },
    }, {
        sequelize: db,
        tableName: 'loan',
        timestamps: false,
        indexes: [
            { unique: false, fields: ['asset', 'address'] }
        ]
    });
}