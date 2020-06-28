import { Sequelize, DataTypes, Model } from 'sequelize';

export class AccountModel extends Model {
    public 'account': string;
    public 'createAtBlock': number;
    public 'createAt': Date;
}

export function initAccountModel (db: Sequelize): Model {
    return AccountModel.init({
        'account': {
            type: DataTypes.STRING,
            primaryKey: true,
            unique: true
        },
        'createAtBlcok': {
            type: DataTypes.INTEGER
        },
        'createAt': {
            type: DataTypes.DATE
        }
    }, {
        sequelize: db,
        tableName: 'account',
        timestamps: false
    });
}