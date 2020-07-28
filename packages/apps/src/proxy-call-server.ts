import { options } from '@acala-network/api';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ProxyCallServer } from '@acala-weaver/proxy-call-server';
import * as dotenv from 'dotenv';

dotenv.config();

const provider = new WsProvider('wss://node-6684611760525328384.rz.onfinality.io/ws');
const dbUrl = 'redis://127.0.0.1:6379';

const server = new ProxyCallServer({
    accounts: [
    ],
    api: new ApiPromise(options({ provider })),
    port: 4000,
    allowAccessTokens: ['I'],
    taskDB: dbUrl
});

server.start();