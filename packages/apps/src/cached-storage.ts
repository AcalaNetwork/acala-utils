import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

import { assert } from '@polkadot/util'

import { CachedStorage } from '@acala-weaver/cached-storage';
import { types as acalaTypes } from '@acala-network/types';
import { WsProvider } from '@polkadot/rpc-provider';
import Scanner from '@open-web3/scanner';

dotenv.config();

async function run (): Promise<void> {
  const dbUrl = process.env.INDEXER_DB || '';
  const redisUrl = process.env.CACHED_DB || '';
  const acalaEndpoint = process.env.ACALA_ENDPOINT || '';

  assert(dbUrl, 'ensure that dbUrl is not empty!');
  assert(redisUrl, 'ensure that dbUrl is not empty!');
  assert(acalaEndpoint, 'ensure that acalaEndpoint is not empty!');

  const db = new Sequelize(dbUrl, {
    logging: false,
    pool: { acquire: 200000, }
  });

  await db.authenticate();
  const provider = new WsProvider(acalaEndpoint);

  const scanner = new Scanner({
    wsProvider: provider,
    types: acalaTypes,
  });

  const storage = new CachedStorage({
    indexer: db,
    url: redisUrl,
    scanner: scanner
  });

  await storage.prepare();

  console.time('NO_CACHE');
  let block = await storage.getBlock(85841, false);
  let extrinsics = await storage.getExtrinsics(85841, false);
  let events = await storage.getEvents(85841, false);

  console.timeEnd('NO_CACHE');

  console.time('CACHE');
  block = await storage.getBlock(85841);
  extrinsics = await storage.getExtrinsics(85841);
  events = await storage.getEvents(85841);

  console.timeEnd('CACHE');

  storage.start(0).subscribe((result) => {
    console.log(result);
  })
}

// if error occur, exit
run().catch((error) => {
  console.log(error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.log('unhandledRejection', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log('unhandleExceptiong', error);
  process.exit(1);
});