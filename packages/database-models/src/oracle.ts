import { Model, DataTypes, Sequelize } from 'sequelize';

export class OracleModel extends Model {
    public id!: string;
    public index!: number;
    public account!: string;
    public currency!: string;
    public amount!: string;
    public createAtBlock!: number;
    public createAt!: number;
}

export function initOracleModel (db: Sequelize): Model {
    return OracleModel.init({
        id: {
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true
        },
        index: {
            type: DataTypes.INTEGER
        },
        account: {
            type: DataTypes.STRING,
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
        createAt: {
            type: DataTypes.DATE
        }
    }, {
        sequelize: db,
        tableName: 'oracle',
        timestamps: false
    });
}
