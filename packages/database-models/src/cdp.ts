import { Sequelize, DataTypes, Model } from 'sequelize';

interface CollateralParams {
    maximumTotalDebitValue: string;
    stabilityFee: string;
    liquidationRatio: string;
    liquidationPenalty: string;
    requiredCollateralRatio: string;
}

export class CdpModel extends Model {
    public id!: string;

    public currency!: string;
    public totalDebit!: string;
    public totalCollateral!: string;
    public debitExchangeRate!: string;
    public globalStabilityFee!: string;
    public callateralParams!: CollateralParams;
    public consts!: unknown;

    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: number;
}

export function initCdpModel (db: Sequelize): Model {
    return CdpModel.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            unique: true
        },
        currency: {
            type: DataTypes.STRING
        },
        totalDebit: {
            type: DataTypes.STRING
        },
        totalCollateral: {
            type: DataTypes.STRING
        },
        debitExchangeRate: {
            type: DataTypes.STRING
        },
        globalStabilityFee: {
            type: DataTypes.STRING
        },
        callateralParams: {
            type: DataTypes.JSON
        },
        consts: {
            type: DataTypes.JSON
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
        tableName: 'cdp',
        timestamps: false
    });
}