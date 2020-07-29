import { options } from '@acala-network/api';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ProxyCallServer } from '@acala-weaver/proxy-call-server';
import * as dotenv from 'dotenv';

dotenv.config();

const taskUrl = process.env.TASK_DB || '';
const faucet = process.env.FAUCET || '';
const sudo = process.env.SUDO || '';
const endpoint = process.env.ACALA_WS_URL || '';
const accessToken = process.env.PROXY_SERVER_KEY || '';

const provider = new WsProvider(endpoint);

const server = new ProxyCallServer({
    accounts: [{
        name: 'faucet',
        mnemonic: faucet
    }, {
        name: 'sudo',
        uri: sudo
    }],
    api: new ApiPromise(options({ provider })),
    allowAccessTokens: [accessToken],
    taskDB: taskUrl,
    port: 4000
});

server.start();

process.on('unhandledRejection', (error) => {
  console.log('unhandledRejection', error);
  process.exit(1);
});

process.on('uncaughtException', () => {
  console.log('unhandleExceptiong');
  process.exit(1);
});