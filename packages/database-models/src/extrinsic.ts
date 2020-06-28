import { Model, DataTypes, Sequelize } from 'sequelize';

export class ExtrinsicModel extends Model {
    public blockHash!: string;
    public blockNumber!: number;
    public index!: number;
    public signer!: string;
    public signature!: string;
    public hash!: string;
    public section!: string;
    public method!: string;
    public args!: unknown[];
    public result!: string;
}

export function initExtrinsicModel (db: Sequelize): Model {
    return ExtrinsicModel.init({
        blockHash: {
            type: DataTypes.STRING,
        },
        blockNumber: {
            type: DataTypes.BIGINT,
        },
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
        }
    }, {
        sequelize: db,
        tableName: 'extrinsic',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['hash'] },
            { unique: false, fields: ['blockHash'] },
            { unique: false, fields: ['blockNumber'] }
        ]
    });
}