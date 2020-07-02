import { Sequelize, DataTypes, Model } from 'sequelize';

export class DexShareHolderModel extends Model {
    public id!: string;
    public asset!: string;
    public address!: string;

    public share!: number;
    public totalShare!: number;

    public shareValue!: number; // primary asset + base asset

    public updateAtBlock!: number;
    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: number;
}

export function initDexShareHolderModel (db: Sequelize): Model {
    return DexShareHolderModel.init({
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

        share: {
            type: DataTypes.INET,
        },
        totalShare: {
            type: DataTypes.INET,
        },

        shareValue: {
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
            type: DataTypes.DATE
        },
    }, {
        sequelize: db,
        tableName: 'dex-shareholder',
        timestamps: false,
        indexes: [
            { unique: false, fields: ['asset', 'address'] }
        ]
    });
}