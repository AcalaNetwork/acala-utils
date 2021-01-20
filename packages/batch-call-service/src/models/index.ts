import { Sequelize } from 'sequelize/types'
import { Transition, TransitionCreationAttributes, TransitionAttributes, initTransitionModel } from './transition'
import { Job, initJobModel } from './job'

export { Transition, Job }

export type { TransitionCreationAttributes, TransitionAttributes }

export function init(sequelize: Sequelize) {
    initTransitionModel(sequelize)
    initJobModel(sequelize)
}
