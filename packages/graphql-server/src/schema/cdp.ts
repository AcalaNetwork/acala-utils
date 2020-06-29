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


    extend type Query {
        cdp(currency: String!, startTime: Date, endTime: Date, limit: Int, skip: Int): [CDP],
    }
`;

interface QueryCDPParams {
    currency?: string;
    startTime: number;
    endTime: number;
    limit?: number;
}

export const cdpResolver = {
    CDP: {
        price: async (parent: any): Promise<any> => {
            console.log(parent.currency, parent.createAtBlock)
            const result = await PriceModel.findOne({
                where: {
                    currency: parent.currency,
                    createAtBlock: parent.createAtBlock 
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
                    createAt: {
                        [Op.between]: [params.startTime || 0, params.endTime || now]
                    }
                },
                order: [
                    ['createAtBlock', 'DESC']
                ],
                limit: params.limit || 20000,
            });
            return result;
        }
    }
}