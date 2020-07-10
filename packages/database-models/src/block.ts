import { Model, DataTypes, Sequelize } from 'sequelize';

export class BlockModel extends Model {
    public blockHash!: string;
    public blockNumber!: number;
    public timestamp!: number;
    public parentHash!: string;
    public author!: string;
    public raw: unknown;
}

export function initBlockModel(db: Sequelize): Model {
    return BlockModel.init({
        blockHash: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        blockNumber: {
            type: DataTypes.BIGINT,
        },
        timestamp: {
            type: DataTypes.BIGINT,
        },
        parentHash: {
            type: DataTypes.STRING,
        },
        author: {
            type: DataTypes.STRING,
        },
        raw: {
            type: DataTypes.JSONB,
        }
    }, {
        sequelize: db,
        tableName: 'block',
        timestamps: false,
        indexes: [{ unique: true, fields: ['blockNumber'] }]
    });
}