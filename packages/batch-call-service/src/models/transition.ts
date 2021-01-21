import { Sequelize, Model, Optional, DataTypes } from 'sequelize'

export type TransitionStatus = 'created' | 'locked' | 'failed' | 'success'

export interface TransitionAttributes {
    id: number
    jobId: number
    section: string
    method: string
    params: any[]
    batchIndex: number
    txHash: string
    status: TransitionStatus
    reason: string
}

export interface TransitionCreationAttributes
    extends Optional<TransitionAttributes, 'id' | 'batchIndex' | 'txHash' | 'reason'> {}

export class Transition
    extends Model<TransitionAttributes, TransitionCreationAttributes>
    implements TransitionAttributes {
    public id!: number
    public jobId!: number
    public section!: string
    public method!: string
    public params!: any[]
    public batchIndex!: number
    public txHash!: string
    public status!: TransitionStatus
    public reason!: string
    public lock!: boolean
    public readonly createdAt!: Date
    public readonly updatedAt!: Date
}

export function initTransitionModel(sequelize: Sequelize) {
    Transition.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            jobId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            section: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            method: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            params: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            batchIndex: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            txHash: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM('created', 'locked', 'success', 'failed'),
                allowNull: false,
            },
            reason: {
                type: DataTypes.STRING,
                allowNull: true,
            }
        },
        {
            indexes: [
                {
                    unique: false,
                    fields: ['section', 'method'],
                },
                {
                    unique: false,
                    fields: ['jobId'],
                },
            ],
            tableName: 'transition',
            sequelize,
        }
    )
}
