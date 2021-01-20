import { Sequelize, Model, Optional, DataTypes } from 'sequelize'

type JobStatus = 'created' | 'processing' | 'complated' | 'error'

interface JobAttributes {
    id: number
    executor: string
    status: JobStatus
    reason: string
}

interface JobCreationAttributes extends Optional<JobAttributes, 'id' | 'reason'> {}

export class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
    public id!: number
    public executor!: string
    public status!: JobStatus
    public reason!: string
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
