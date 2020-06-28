import { Transaction } from 'sequelize';

export interface HandlerConfig {
    transition: Transaction
}