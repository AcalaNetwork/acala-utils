import { gql } from 'apollo-server';

import { PriceModel } from '@acala-weaver/database-models';

export const priceTypeDefs = gql`
    type Price {
        id: String
        currency: String
        amount: String

        createAtBlock: Int
        createAtBlockHash: String
        createAt: Date
    }

    extend type Query {
        price(currency: String!, block: Int!): Price
    }
`;

interface QueryPriceParams {
    currency?: string;
    block?: number;
}

export const priceResolver = {
    Query: {
        price: async (_parent: unknown, params: QueryPriceParams): Promise<unknown[]> => {
            const result = await PriceModel.findAll({
                where: {
                    currency: params.currency,
                    createAtBlock: params.block 
                }
            });
            return result;
        }
    }
}