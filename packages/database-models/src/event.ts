import { Model, DataTypes, Sequelize } from 'sequelize';

export class EventModel extends Model {
    public id!: string;
    public index!: number;
    public section!: string;
    public method!: string;
    public args!: unknown[];
    public phaseType!: string;
    public phaseIndex!: string;

    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAt!: Date;
}

export function initEventModel (db: Sequelize): Model {
    return EventModel.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        index: {
            type: DataTypes.INTEGER,
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
        phaseType: {
            type: DataTypes.STRING
        },
        phaseIndex: {
            type: DataTypes.STRING
        },

        createAtBlockHash: {
            type: DataTypes.STRING,
        },
        createAtBlock: {
            type: DataTypes.BIGINT,
        },
        createAt: {
            type: DataTypes.STRING,
        }
    }, {
        sequelize: db,
        tableName: 'event',
        timestamps: false,
        indexes: [
            { unique: false, fields: ['createAtBlock'] },
            { unique: false, fields: ['createAtBlockHash'] },
            { unique: false, fields: ['section'] },
            { unique: false, fields: ['method'] }
        ]
    });
}
