import * as dotenv from 'dotenv';

import { types } from '@acala-network/types';
import { WsProvider } from '@polkadot/rpc-provider';
import { assert } from '@polkadot/util'

import { Recoder } from '@acala-weaver/storage-recoder';

dotenv.config();

async function run (): Promise<void> {
  const wsUrl = process.env.ACALA_WS_URL || 'wss://testnet-node-1.acala.laminar.one/ws';
  const host = process.env.INFLUX_DB;

  assert(host, 'influxed db host should not be empty !');

  const wsProvider = new WsProvider(wsUrl, false);
  const recoder = new Recoder({ wsProvider, types, host });

  await recoder.run();
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

process.on('uncaughtException', () => {
  console.log('unhandleExceptiong');
  process.exit(1);
});