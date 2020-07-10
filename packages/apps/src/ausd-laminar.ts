import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

import { types as acalaTypes } from '@acala-network/types';
import { types as laminarTypes } from '@laminar/types';
import { WsProvider } from '@polkadot/rpc-provider';
import { assert } from '@polkadot/util'

import { AcalaMover, LaminarMover } from '@acala-weaver/ausd-mover';

dotenv.config();

async function run (): Promise<void> {
  const acalaWsUrl = process.env.ACALA_WS_URL || '';
  const laminarWsUrl = process.env.LAMINAR_WS_URL || '';
  const dbUri = process.env.AUSD_MOVER_DB_URI || ''
  const acalaWatcherAddress = process.env.ACALA_WATCHER_ADDRESS || '';
  const laminarWatcherAddress = process.env.LAMINAR_WATCHER_ADDRESS || '';
  const moverMnemonic = process.env.MOVER_MNEMONIC || '';

  assert(acalaWatcherAddress, 'acalaWatcherAddress should not be empty !');
  assert(laminarWatcherAddress, 'laminarWatcherAddress should not be empty !');
  assert(acalaWsUrl, 'acalaWsUrl should not be empty !');
  assert(laminarWsUrl, 'laminarWsUrl should not be empty !');
  assert(dbUri, 'dbUri should not be empty !');

  const db = new Sequelize(dbUri, {
    logging: false,
    pool: { acquire: 200000, }
  });
  const acalaWsProvider = new WsProvider(acalaWsUrl, false);
  const laminarWsProvider = new WsProvider(laminarWsUrl, false);

  const laminarMover = new LaminarMover({
      db: db,
      mnemonic: moverMnemonic,
      // acala
      acalaEndpoint: acalaWsUrl,
      acalaScannerOptions: {
          types: acalaTypes,
          wsProvider: acalaWsProvider
      },
      acalaWatcherAddress: acalaWatcherAddress,
      // laminar
      laminarEndpoint: laminarWsUrl,
      laminarScannerOptions: {
          types: laminarTypes,
          wsProvider: laminarWsProvider
      },
      laminarWatcherAddress: laminarWatcherAddress
  });

  await laminarMover.run();
}

// if error occur, exit
run().catch((error) => {
  console.log(error);
  process.exit(1);
});

// process.on('unhandledRejection', (error) => {
//   console.log('unhandledRejection', error);
//   process.exit(1);
// });

// process.on('uncaughtException', (error) => {
//   console.log('unhandleExceptiong', error);
//   process.exit(1);
// });