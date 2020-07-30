import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

import { types } from '@acala-network/types';
import { WsProvider } from '@polkadot/rpc-provider';
import { run } from '@acala-weaver/statisticize-profit';

import Scanner from '@open-web3/scanner';

dotenv.config();

async function start (): Promise<void> {
  const wsUrl = process.env.ACALA_WS_URL || '';
  const recorderDBUri = process.env.CHAIN_RECORDER_DB || '';

  const recoderDB = new Sequelize(recorderDBUri, {
    logging: false,
    pool: { acquire: 200000, }
  });
  const wsProvider = new WsProvider(wsUrl, false);

  const scanner = new Scanner({ wsProvider, types });

  await recoderDB.authenticate();
  run(scanner, 500000, 600000); 
}

// if error occur, exit
start().catch((error) => {
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