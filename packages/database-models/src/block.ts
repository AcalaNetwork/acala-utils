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
            allowNull: false
        },
        timestamp: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        parentHash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        author: {
            type: DataTypes.STRING,
            allowNull: true
        },
        raw: {
            type: DataTypes.JSONB,
            allowNull: false
        }
    }, {
        sequelize: db,
        tableName: 'block',
        timestamps: false,
        indexes: [{ unique: true, fields: ['blockNumber'] }]
    });
}