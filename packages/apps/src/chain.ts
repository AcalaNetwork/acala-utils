import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

import { types } from '@acala-network/types';
import { assert } from '@polkadot/util'
import { WsProvider } from '@polkadot/rpc-provider';

import { Recoder } from '@acala-weaver/chain-recoder';

dotenv.config();

async function run (): Promise<void> {
  const dbUrl = process.env.DB_URI || '';
  const wsUrl = process.env.WS_URL || '';

  assert(wsUrl, 'ensure that wsUrl is not empty!');
  assert(dbUrl, 'ensure that dbUrl is not empty!');

  const db = new Sequelize(dbUrl, {
    logging: false,
    pool: { acquire: 200000, }
  });
  const wsProvider = new WsProvider(wsUrl, false);

  await db.authenticate();

  const recoder = new Recoder({ wsProvider, db, types });

  recoder.run();
}

// if error occur, exit
run().catch((error) => {
  console.log(error);
  process.exit(1);
});

process.on('unhandledRejection', () => {
  console.log('unhandledRejection');
  process.exit(1);
});

process.on('uncaughtException', () => {
  console.log('unhandleExceptiong');
  process.exit(1);
});