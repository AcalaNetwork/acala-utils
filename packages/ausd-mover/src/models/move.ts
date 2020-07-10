import { Model, DataTypes, Sequelize } from 'sequelize';

export class MoveModel extends Model {
    public id!: string;

    public address!: string;
    public from!: string;
    public to!: string;
    public amount!: string;
    public result!: 'record' | 'sended' | 'success' | 'failure'; 
    public resultExtrinsicHash!: string;
    public resultExtrinsicBlock!: number;
    public errorMessage!: string;

    public lock!: number;

    public createAtBlock!: number;
    public createAtBlockHash!: string;
    public createAtChain!: 'acala' | 'laminar';
}

export function initMoveModel(db: Sequelize): Model {
    return MoveModel.init({
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        address: {
            type: DataTypes.STRING,
        },
        from: {
            type: DataTypes.STRING,
        },
        to: {
            type: DataTypes.STRING,
        },
        amount: {
            type: DataTypes.STRING,
        },
        result: {
            type: DataTypes.STRING,
        },
        resultExtrinsicBlock: {
            type: DataTypes.BIGINT,
        },
        resultExtrinsicHash: {
            type: DataTypes.STRING,
        },
        errorMessage: {
            type: DataTypes.STRING,
        },
        lock: {
            type: DataTypes.BIGINT
        },
        createAtBlock: {
            type: DataTypes.BIGINT,
        },
        createAtBlockHash: {
            type: DataTypes.STRING
        },
        createAtChain: {
            type: DataTypes.STRING
        }
    }, {
        sequelize: db,
        tableName: 'move-job',
        timestamps: false,
        indexes: [{ unique: true, fields: ['id'] }]
    });
}