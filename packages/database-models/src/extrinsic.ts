import { Model, DataTypes, Sequelize } from 'sequelize';

export class ExtrinsicModel extends Model {
    public index!: number;
    public signer!: string;
    public signature!: string;
    public hash!: string;
    public section!: string;
    public method!: string;
    public args!: unknown[];
    public result!: string;
    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: Date;
}

export function initExtrinsicModel (db: Sequelize): Model {
    return ExtrinsicModel.init({
        index: {
            type: DataTypes.INTEGER,
        },
        signer: {
            type: DataTypes.STRING,
        },
        hash: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        section: {
            type: DataTypes.STRING,
        },
        method: {
            type: DataTypes.STRING,
        },
        args: {
            type: DataTypes.JSONB
        },
        bytes: {
            type: DataTypes.BLOB
        },

        createAtBlock: {
            type: DataTypes.BIGINT,
        },
        createAtBlockHash: {
            type: DataTypes.STRING,
        },
        createAt: {
            type: DataTypes.STRING
        }
    }, {
        sequelize: db,
        tableName: 'extrinsic',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['hash'] },
            { unique: false, fields: ['createAtBlockHash'] },
            { unique: false, fields: ['createAtBlock'] }
        ]
    });
}