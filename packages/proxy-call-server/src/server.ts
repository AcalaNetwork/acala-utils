import { ApiPromise } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { DispatchError } from '@polkadot/types/interfaces';
import { ITuple } from '@polkadot/types/types';
import { get, noop } from 'lodash';
import { Keyring } from '@polkadot/keyring';
import { KeyringOptions, KeyringPair } from '@polkadot/keyring/types';
import * as express from 'express';
import * as winston from 'winston';
import * as bodyParser from 'body-parser';
import { TaskManager } from './task';

const format = winston.format;

const logger = winston.createLogger({
  format: format.combine(format.json(), format.prettyPrint()),
  transports: [ new winston.transports.Console() ],
});

interface AccountConfig {
  name: string;
  mnemonic: string;
  options?: KeyringOptions;
}

interface ProxyCallServerConfig {
  api: ApiPromise;
  port: number | string;
  accounts: AccountConfig[];
  allowAccessTokens: string[];
  taskDB: string;
}

interface CallParams {
  path: string;
  params: string;
  account: 'FAUCET' | 'SUDO';
  isSudo?: boolean;
  isBatch?: boolean;
}

export class ProxyCallServer {
  private api!: ApiPromise;
  private accounts!: {
    name: string;
    pair: KeyringPair
  }[];
  private accountsConfig!: AccountConfig[]
  private allowAccessTokens: string[];
  private port!: number | string;
  private taskManager!: TaskManager;

  constructor(config: ProxyCallServerConfig) {
    this.api = config.api;
    this.allowAccessTokens = config.allowAccessTokens;
    this.accountsConfig = config.accounts;
    this.port = config.port;

    this.execCall = this.execCall.bind(this);
    this.validAccessToken = this.validAccessToken.bind(this);

    this.taskManager = new TaskManager({
      url: config.taskDB,
      handler: this.execCall
    });
  }

  importAccounts (accounts: AccountConfig[]): { name: string, pair: KeyringPair }[] {
    return accounts.map((item) => {
      const keyring = new Keyring(item.options || { type: 'sr25519' });

      return {
        name: item.name,
        pair: keyring.addFromMnemonic(item.mnemonic),
      }
    });
  }

  async start () {
    await this.api.isReady;
    this.accounts = this.importAccounts(this.accountsConfig);

    this.startServer();
  }

  startServer () {
    const app = express();

    app.use(bodyParser.json());
    app.use(this.validAccessToken);

    app.get('/ping', (req, res) => {
      res.send('pong');
    });

    app.post('/add-call', async (req, res) => {
      if (!req.body.data) {
        res.send({ result: false, msg: 'post need data' });
      }

      const result = await this.addCall(req.body.data);

      res.send(result);
    });

    app.get('/accounts', (req, res) => {
      res.send(this.accounts.map((itme) => ({ name: itme.name, address: itme.pair.address })));
    });

    app.listen(this.port, () => {
      logger.log('info', `server start at ${this.port}`);
    });
  }

  async validAccessToken (req: express.Request, res: express.Response, next: () => any) {
    // validat access token in post request
    if (req.method === 'POST') {
      const index = this.allowAccessTokens.findIndex((item) => item === req.body.accessToken);

      if (index === -1) {
        res.send({ result: 'no authority' })
        return;
      }
    }

    next();
  }

  async addCall (data: CallParams): Promise<{ result: boolean, msg: string | number }> {
    // pretest tx creator
    const txC = get(this.api, 'tx.' + data.path);

    if (!txC) {
      return { result: false, msg: `can't find tx.${data.path} method` };
    }

    try {
      (txC as any).apply(this, data.params);
    } catch (e) {
      return { result: false , msg: `error: ${e.toString()}` };
    }

    // check account is exist
    const accountIndex = this.accounts.findIndex((item) => item.name === data.account);

    if (accountIndex === -1) {
      return { result: false, msg: `account:${data.account} doesn't exist` }
    }

    try {
      const job = await this.taskManager.callQueue.add(data);
      return { result: true, msg: job.id };
    } catch (e) {
      return { result: false, msg: e.toString() };
    }
  }

  async execCall (data: CallParams): Promise<any> {
    let onReject: (resone?: any) => void = noop;
    let onResolve: () => void = noop;
    const promise = new Promise((resolve, reject) => {
      onResolve = resolve;
      onReject = reject;
    });

    // pretest tx creator
    const txC = get(this.api, 'tx.' + data.path);

    if (!txC) {
      onReject(`can't find tx.${data.path} method`);

      return promise;
    }

    const account = this.accounts.find((item) => item.name === data.account);

    if (!account) {
      onReject(`account:${data.account} doesn't exist`);

      return promise;
    }

    try {
      const tx = await ((txC as any).apply(this, data.params) as SubmittableExtrinsic<'promise'>).signAsync(account!.pair);

      tx.send((result) => {
        if (result.isCompleted) {
          let flag = true;
          let errorMessage: DispatchError['type']= '';

          for (const event of result.events) {
            const { data, method, section } = event.event;

            // if extrinsic failed
            if (section === 'system' && method === 'ExtrinsicFailed') {
              const [dispatchError] = data as unknown as ITuple<[DispatchError]>;
              
              // get error message
              if (dispatchError.isModule) {
                try {
                  const mod = dispatchError.asModule;
                  const error = this.api.registry.findMetaError(new Uint8Array([Number(mod.index), Number(mod.error)]));
      
                  errorMessage = `${error.section}.${error.name}`;
                } catch (error) {
                  // swallow error
                  errorMessage = 'Unknown error';
                }
              }
              flag = false;
            }
          }

          if (flag) {
            onResolve();
          } else {
            onReject(errorMessage);
          }
        }
      });
    } catch (e) {
      onReject(e);
    }

    return promise;
  }
}