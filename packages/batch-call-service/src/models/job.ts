import { Sequelize, Model, Optional, DataTypes } from 'sequelize'

type JobStatus = 'creating' | 'created' | 'processing' | 'complated' | 'error'

interface JobAttributes {
    id: number
    executor: string
    status: JobStatus
    sudo?: boolean
    reason: string
}

interface JobCreationAttributes extends Optional<JobAttributes, 'id' | 'reason'> {}

export class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
    public id!: number
    public executor!: string
    public status!: JobStatus
    public reason!: string
    public sudo!: boolean
}

export function initJobModel(sequelize: Sequelize) {
    Job.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            executor: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            reason: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            sudo: {
                type: DataTypes.BOOLEAN,
                allowNull: true
            }
        },
        {
            indexes: [
                {
                    unique: false,
                    fields: ['status'],
                },
            ],
            tableName: 'job',
            sequelize,
        }
    )
}
