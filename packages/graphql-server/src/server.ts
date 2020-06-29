import { ApolloServer, } from 'apollo-server';
import { Sequelize } from 'sequelize';
import { defaultLogger } from '@open-web3/util';

import { initCdpModel, initPriceModel } from '@acala-weaver/database-models';

import schema from './schema';

const logger = defaultLogger.createLogger('graphql-server');

interface GraphQLServerConfig {
    port: string | number;
    db: Sequelize;
}
export class GraphQLServer {
    private port: string | number;
    private db: Sequelize;

    constructor ({ port, db}: GraphQLServerConfig) {
        this.port = port;
        this.db = db;
    }

    run (): void {
        initCdpModel(this.db);
        initPriceModel(this.db);

        const server = new ApolloServer({
            schema,
            context: { db: this.db, logger: logger }
        });

        server.listen(this.port).then(({ url }) => {
          logger.info(`🚀  Server ready at ${url}`);
        });
    }
}
