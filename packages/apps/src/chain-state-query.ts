import * as dotenv from 'dotenv';

import { types } from '@acala-network/types';
import { Fixed18, calcSupplyInBaseToOther, convertToFixed18 } from '@acala-network/app-util';
import { WsProvider } from '@polkadot/rpc-provider';
import Scanner from '@open-web3/scanner';
import { getDex } from '@acala-weaver/scan-storage-data';


dotenv.config();

async function run (): Promise<void> {
  const wsUrl = process.env.ACALA_WS_URL || 'wss://testnet-node-1.acala.laminar.one/ws';
  const wsProvider = new WsProvider(wsUrl, false);
  const scanner = new Scanner({
    wsProvider: wsProvider,
    types
  });

  await scanner.wsProvider.connect();

  const block = await scanner.getBlockDetail({ blockNumber: 446566 });

  const dex = await getDex('ACA', block, scanner);

  console.log(dex.other.innerToString());
  console.log(dex.base.innerToString());

  const a = calcSupplyInBaseToOther(
    Fixed18.fromNatural(0.001),
    {
      other: convertToFixed18(dex.other),
      base: convertToFixed18(dex.base)
    },
    Fixed18.fromNatural(0.001)
  );

  const slippage = a.div(a.add(convertToFixed18(dex.base)))
  
  console.log(a.toNumber(18, 2));
  console.log(slippage.toNumber(18, 2));
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