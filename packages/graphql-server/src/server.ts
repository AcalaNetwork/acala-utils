import { ApolloServer, gql } from 'apollo-server';
import { Sequelize } from 'sequelize';

export class GraphQLServer {

    constructor (
        private port: number | string
    ) {}

    run () {
        const server = new ApolloServer({ typeDefs, resolvers });

        // The `listen` method launches a web server.
        server.listen(this.port).then(({ url }) => {
          console.log(`🚀  Server ready at ${url}`);
        });
    }
}
