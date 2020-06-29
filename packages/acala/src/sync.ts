import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

import { types } from '@acala-network/types';
import { WsProvider } from '@polkadot/rpc-provider';

import { Scanner } from '@acala-weaver/scanner';
import { acala } from '@acala-weaver/scanner-sub-service';

dotenv.config();

async function run (): Promise<void> {
  const dbUrl = process.env.DB_URI || '';
  const wsUrl = process.env.WS_URL || 'wss://testnet-node-1.acala.laminar.one/ws';

  const db = new Sequelize(dbUrl, {
    logging: false,
    ssl: true,
    pool: {
      acquire: 200000,
    }
  });
  const wsProvider = new WsProvider(wsUrl, false);

  await db.authenticate();

  const scanner = new Scanner({ db, wsProvider, types });

  scanner.addService('account-service', acala.AccountService);
  scanner.addService('oracle-service', acala.OracleService);
  scanner.addService('price-service', acala.PriceService);
  scanner.addService('transfer-service', acala.TransferService);
  scanner.addService('cdp-service', acala.CdpService);

  await scanner.start();
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