import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

import { GraphQLServer } from '@acala-weaver/graphql-server';

dotenv.config();

async function run (): Promise<void> {
  const dbUrl = process.env.DB_URI || '';
  const port = process.env.GRAPHQL_SERVER_PORT || '4000';
  const db = new Sequelize(dbUrl, {
    logging: false,
    ssl: true,
    pool: {
      acquire: 200000,
    }
  });
  await db.authenticate();
  
  const graphQLServer = new GraphQLServer({ port, db });

  graphQLServer.run();
}

run().catch((error) => {
    console.log('error', error);
});
