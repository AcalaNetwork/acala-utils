import { gql } from 'apollo-server';
import { Op } from 'sequelize';

import { CdpModel, PriceModel } from '@acala-weaver/database-models';

export const cdpTypeDefs = gql`
    type CollateralParams {
        maximumTotalDebitValue: String
        stabilityFee: String
        liquidationRatio: String
        liquidationPenalty: String
        requiredCollateralRatio: String
    }

    type CDPConsts {
        collateralCurrencyIds: [String]
        defaultDebitExchangeRate: String
        defaultLiquidationPenalty: String
        defaultLiquidationRatio: String
        getStableCurrencyId: String
        maxSlippageSwapWithDex: String
        minimumDebitValue: String
    }

    type CDP {
        id: String
        currency: String
        totalDebit: String
        totalCollateral: String
        debitExchange: String
        globalStabilityFee: String
        collateralParams: CollateralParams
        consts: CDPConsts

        createAtBlock: Int
        createAtBlockHash: String
        createAt: Date

        price: Price

    }

    type CDPWithCurrency {
        currency: String
        cdps: [CDP]
    }

    extend type Query {
        cdp(currency: String!, startTime: Date, endTime: Date, limit: Int, skip: Int): [CDP],
        cdps(currencies: [String]!, limit: Int): [CDPWithCurrency]
    }
`;

interface QueryCDPParams {
    currency?: string;
    startTime: number;
    endTime: number;
    limit?: number;
}

interface CDPData {
    currency: string;
    createAtBlock: number;
}

export const cdpResolver = {
    CDP: {
        price: async (parent: CDPData): Promise<any> => {
            const result = await PriceModel.findOne({
                where: {
                    currency: parent.currency,
                    createAtBlock: parent.createAtBlock ,
                }
            });
            return result;
        }
    },
    Query: {
        cdp: async (_parent: unknown, params: QueryCDPParams): Promise<unknown[]> => {
            const now = new Date().getTime();
            const result = await CdpModel.findAll({
                where: {
                    currency: params.currency,
                    chartFlag: true,
                    createAt: {
                        [Op.between]: [params.startTime || 0, params.endTime || now]
                    }
                },
                order: [
                    ['createAtBlock', 'DESC']
                ],
                limit: params.limit || 2000,
            });
            return result;
        },
        cdps: async (_parent: unknown, params: { currencies: string[], limit: number }): Promise<unknown[]> => {
            const now = new Date().getTime();
            const result = await Promise.all(params.currencies.map((currency: string) => {
                return CdpModel.findAll({
                    where: {
                        currency: currency,
                        chartFlag: true,
                        createAt: {
                            [Op.between]: [0, now]
                        }
                    },
                    order: [
                        ['createAtBlock', 'DESC']
                    ],
                    limit: params.limit || 2000,
                });
            }));

            return params.currencies.map((currency: string, index: number) => ({
                currency,
                cdps: result[index]
            }));
        }
    }
}