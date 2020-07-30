import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

import { types } from '@acala-network/types';
import { WsProvider } from '@polkadot/rpc-provider';

import { Recoder } from '@acala-weaver/chain-recoder';
import Scanner from '@open-web3/scanner';

dotenv.config();

async function run (): Promise<void> {
  const wsUrl = process.env.ACALA_WS_URL || '';
  const recorderDBUri = process.env.CHAIN_RECORDER_DB || '';
  const indexerDBUri = process.env.INDEXER_DB || '';
  const redisUri = process.env.CACHED_DB || '';

  const recoderDB = new Sequelize(recorderDBUri, {
    logging: false,
    pool: { acquire: 200000, }
  });
  const wsProvider = new WsProvider(wsUrl, false);

  const indexerDB = new Sequelize(indexerDBUri, {
    logging: false,
    pool: { acquire: 200000, }
  });
  const scanner = new Scanner({ wsProvider, types });

  await recoderDB.authenticate();
  await indexerDB.authenticate();

  const recoder = new Recoder({ 
    indexer: indexerDB,
    url: redisUri,
    scanner,
    recoderDB,
  });

  recoder.run();
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