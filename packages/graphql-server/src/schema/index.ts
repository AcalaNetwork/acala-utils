import { gql, makeExecutableSchema } from 'apollo-server';
import graphqlJSON from 'graphql-type-json';

import { cdpTypeDefs, cdpResolver } from './cdp';
import { priceTypeDefs, priceResolver } from './price';

// default query type
const query = gql`
    scalar Date
    scalar JSON

    type Query {
        _empyt: String
    }
`;

export default makeExecutableSchema({
    typeDefs: [
        query,
        cdpTypeDefs,
        priceTypeDefs
    ],
    resolvers: {
        JSON: graphqlJSON,
        ...cdpResolver,
        ...priceResolver,
        Query: {
            ...cdpResolver.Query,
            ...priceResolver.Query
        }
    }
});