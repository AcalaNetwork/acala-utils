import { Sequelize, DataTypes, Model } from 'sequelize';

export class AccountModel extends Model {
    public account!: string;
    public createAtBlock!: number;
    public createAtBlockHahs!: string;
    public createAt!: Date;
}

export function initAccountModel (db: Sequelize): Model {
    return AccountModel.init({
        account: {
            type: DataTypes.STRING,
            primaryKey: true,
            unique: true
        },
        createAtBlock: {
            type: DataTypes.INTEGER
        },
        createAtBlockHash: {
            type: DataTypes.STRING
        },
        createAt: {
            type: DataTypes.STRING
        }
    }, {
        sequelize: db,
        tableName: 'account',
        timestamps: false
    });
}