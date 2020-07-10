import { Sequelize, Op } from 'sequelize';
import { ChainSpider, SpiderController } from '@acala-weaver/chain-spider';
import { ScannerOptions } from '@open-web3/scanner/types';
import { WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';
import { options as laminarOptions } from '@laminar/api';
import { options as acalaOptions } from '@acala-network/api';
import { ApiOptions, SubmittableExtrinsic } from '@polkadot/api/types';
import { ITuple } from '@polkadot/types/types';
import { DispatchError } from '@polkadot/types/interfaces';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { interval, Subject, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { initAcalaSyncModel, initLaminarSyncModel, LaminarSyncModel, AcalaSyncModel } from './models/sync';
import { initMoveModel, MoveModel } from './models/move';

interface Options {
  acalaScannerOptions: ScannerOptions;
  laminarScannerOptions: ScannerOptions;

  db: Sequelize;
  acalaEndpoint: string;
  laminarEndpoint: string;
  acalaWatcherAddress: string;
  laminarWatcherAddress: string;
  mnemonic: string;
}

interface TransferJob {
  id: string;
  from: string;
  to: string;
  address: string;
  amount: string;
  result: string;
  createAtBlock: number;
  createAtBlockHash: string;
  createAtChain: string;
}

type OptionsFN = (config?: ApiOptions) => ApiOptions;

/* eslint-disable-next-line */
const noop = () => {};

async function createApi (endpoint: string, options: OptionsFN): Promise<ApiPromise> {
  const provider = new WsProvider(endpoint);
  const api = new ApiPromise(options({ provider }));
  await api.isReady;

  return api;
}

class AcalaSyncController implements SpiderController {
  async getLatestBlock(): Promise<number> {
    const result = await AcalaSyncModel.max('blockNumber');

    return Number(result) || 0;
  }

  async onSyncSuccess(blockNumber: number): Promise<boolean> {
    await AcalaSyncModel.upsert({ blockNumber, status: true });

    return true;
  }


  async onSyncFailure(blockNumber: number): Promise<boolean> {
    await AcalaSyncModel.upsert({ blockNumber, status: false });

    return true;
  }
}

class LaminarSyncController implements SpiderController {
  async getLatestBlock(): Promise<number> {
    const result = await LaminarSyncModel.max('blockNumber');

    return Number(result) || 0;
  }

  async onSyncSuccess(blockNumber: number): Promise<boolean> {
    await LaminarSyncModel.upsert({ blockNumber, status: true });

    return true;
  }


  async onSyncFailure(blockNumber: number): Promise<boolean> {
    await LaminarSyncModel.upsert({ blockNumber, status: false });

    return true;
  }
}

// FIXME: use acalaApi and laminarApi in one program will orrur unknown error, temporarily separated AcalaMover & LaminarMover

export class AcalaMover {
  #acalaSpider!: ChainSpider;
  #laminarSpider!: ChainSpider;
  #db!: Sequelize;
  #acalaEndpoint!: string;
  #laminarEndpoint!: string;
  #acalaWatcherAddress!: string;
  #laminarWatcherAddress!: string;
  #acalaApi!: ApiPromise;
  #laminarApi!: ApiPromise;
  #mnemonic!: string;
  #sender!: KeyringPair;
  #transferJob$!: Subject<TransferJob>;

  constructor(options: Options) {
    this.#db = options.db;
    this.#acalaEndpoint = options.acalaEndpoint;
    this.#laminarEndpoint = options.laminarEndpoint;
    this.#acalaWatcherAddress = options.acalaWatcherAddress;
    this.#laminarWatcherAddress = options.laminarWatcherAddress;
    this.#mnemonic = options.mnemonic;
    this.#transferJob$ = new Subject<TransferJob>();

    this.initDB();

    // init chainSpider
    this.#acalaSpider = new ChainSpider({
      ...options.acalaScannerOptions,
      controller: new AcalaSyncController(),
      loggerName: 'acala-spider'
    });
  }

  async initSender(): Promise<void> {
    const keyring = new Keyring({ type: 'sr25519' });
    this.#sender = keyring.addFromMnemonic(this.#mnemonic);
  }

  initDB(): void {
    initAcalaSyncModel(this.#db);
    initMoveModel(this.#db);
  }

  async initApi(): Promise<void> {
    this.#laminarApi = await createApi(this.#laminarEndpoint, laminarOptions as unknown as OptionsFN);

    await this.#laminarApi.isReady;
  }

  async saveMoveJobResult (id: string, hash: string, isSuccess: boolean, errorMessage?: string): Promise<void> {
    MoveModel.update(
      {
        result: isSuccess ? 'success' : 'failure',
        resultExtrinsicHash: hash,
        errorMessage,
      },
      { where: { id } }
    );
  }

  handleTranfer (): void {
    this.#transferJob$.pipe(
      concatMap((job) => {
        return from(this.move(job.id, job.from, job.to, job.address, job.amount));
      })
    ).subscribe();
  }

  async move(id: string, from: string, to: string, address: string, amount: string): Promise<void> {
    const timestamp = new Date().getTime();
    const record = await MoveModel.findOne({ where: { id } });
    let inBlockResolve = noop;
    let inBlockReject = (error?: unknown) => { return error; };

    const inBlokcPromise  = new Promise<unknown>((resolve, reject) => {
      inBlockResolve = resolve;
      inBlockReject = reject;
    });


    // if job doesn't exisit, do noting.
    if (!record) return;

    if ((timestamp - record.lock) < 1000 * 60 * 5) {
      return;
    }
    // if job is locked or had been process, do noting.
    if (record.result === 'success') {
      return;
    }

    await MoveModel.update({ lock: timestamp }, { where: { id }});

    let __api: ApiPromise | null = null;
    let tx: SubmittableExtrinsic<'promise'> | null = null;

    try {
      if (from === 'acala' && to === 'laminar') {
        __api = this.#laminarApi;
        tx = await this.#laminarApi.tx.tokens.transfer(address, 'AUSD', amount).signAsync(this.#sender);
      }

      if (tx && __api) {
          await tx.send((result) => {
            if (result.isCompleted) {
              let flag = true;
              let errorMessage: DispatchError['type']= '';
              for (const event of result.events) {
                const { data, method, section } = event.event;

                if (section === 'system' && method === 'ExtrinsicFailed') {
                  const [dispatchError] = data as unknown as ITuple<[DispatchError]>;
          
                  if (dispatchError.isModule) {
                    try {
                      const mod = dispatchError.asModule;
                      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
                      const error = __api!.registry.findMetaError(new Uint8Array([Number(mod.index.toString()), Number(mod.error.toString())]));
          
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
                inBlockResolve();
              } else {
                inBlockReject(errorMessage);
              }
            }
            if (result.isError) {
              inBlockReject();
            }
          })

          await MoveModel.update({ result: 'sended' }, { where: { id }});

          await inBlokcPromise
            .then(() => {
              /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
              this.saveMoveJobResult(id, tx!.hash.toString(), true);
            }).catch((error) => {
              throw error;
            })
        }
    } catch(e) {
      console.log('error', e);
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      this.saveMoveJobResult(id, tx!.hash.toString(), false, e.toString());
    }
  }

  retryMoveJob (): void {
    interval(1000 * 60).subscribe(async (): Promise<void> => {
      const records = await MoveModel.findAll({
        limit: 10,
        where: {
          [Op.or]: [
            { result: 'record' },
            { result: 'failure' }
          ]
        }
      });

      for (const item of records) {
        this.#transferJob$.next(item);
      }
    });
  }

  async run(): Promise<void> {
    await this.#db.sync();

    await cryptoWaitReady();
    await this.initSender();

    await this.initApi();

    this.handleTranfer();
    this.retryMoveJob();

    // initialize context
    this.#acalaSpider.use(async (data, next, context) => {
      context.db = this.#db;
      context.watcherAddress = this.#acalaWatcherAddress;

      await next();
    });

    this.#acalaSpider.use(async (data, next, context) => {
      if (data.result) {
        const temp = data.result.events
          // filter ausd transfer message
          .filter((event) => {
            if (event.section === 'currencies' && event.method === 'Transferred') {
              const asset = event.args[0];
              const toAccount = event.args[2];

              return asset === 'AUSD' && toAccount === this.#acalaWatcherAddress;
            }

            return false;
          })
          .map(event => {
            return {
              id: `acala_laminar_${event.args[1]}_${event.index}_${data.blockNumber}`,

              from: 'acala',
              to: 'laminar',
              address: event.args[1],
              amount: event.args[3],
              result: 'record',

              createAtBlock: data.blockNumber,
              createAtBlockHash: data.result.hash,
              createAtChain: 'acala'
            }
          });

          if (temp.length) {
            await MoveModel.bulkCreate(temp, { 
              ignoreDuplicates: true // Don't reset the exsit job
            });
          }

          for (const item of temp) {
            this.#transferJob$.next(item);
          }
      }

      await next();
    });

    this.#acalaSpider.start();
  }
}


export class LaminarMover {
  #acalaSpider!: ChainSpider;
  #laminarSpider!: ChainSpider;
  #db!: Sequelize;
  #acalaEndpoint!: string;
  #laminarEndpoint!: string;
  #acalaWatcherAddress!: string;
  #laminarWatcherAddress!: string;
  #acalaApi!: ApiPromise;
  #laminarApi!: ApiPromise;
  #mnemonic!: string;
  #sender!: KeyringPair;
  #transferJob$!: Subject<TransferJob>;

  constructor(options: Options) {
    this.#db = options.db;
    this.#acalaEndpoint = options.acalaEndpoint;
    this.#laminarEndpoint = options.laminarEndpoint;
    this.#acalaWatcherAddress = options.acalaWatcherAddress;
    this.#laminarWatcherAddress = options.laminarWatcherAddress;
    this.#mnemonic = options.mnemonic;
    this.#transferJob$ = new Subject<TransferJob>();

    this.initDB();

    // init chainSpider
    this.#laminarSpider = new ChainSpider({
      ...options.laminarScannerOptions,
      controller: new LaminarSyncController(),
      loggerName: 'laminar-spider'
    });
  }

  async initSender(): Promise<void> {
    const keyring = new Keyring({ type: 'sr25519' });
    this.#sender = keyring.addFromMnemonic(this.#mnemonic);
  }

  initDB(): void {
    initAcalaSyncModel(this.#db);
    initLaminarSyncModel(this.#db);
    initMoveModel(this.#db);
  }

  async initApi(): Promise<void> {
    this.#acalaApi = await createApi(this.#acalaEndpoint, acalaOptions as unknown as OptionsFN);

    await this.#acalaApi.isReady;
  }

  async saveMoveJobResult (id: string, hash: string, isSuccess: boolean, errorMessage?: string): Promise<void> {
    MoveModel.update(
      {
        result: isSuccess ? 'success' : 'failure',
        resultExtrinsicHash: hash,
        errorMessage,
      },
      { where: { id } }
    );
  }

  handleTranfer (): void {
    this.#transferJob$.pipe(
      concatMap((job) => {
        return from(this.move(job.id, job.from, job.to, job.address, job.amount));
      })
    ).subscribe();
  }

  async move(id: string, from: string, to: string, address: string, amount: string): Promise<void> {
    const timestamp = new Date().getTime();
    const record = await MoveModel.findOne({ where: { id } });
    let inBlockResolve = noop;
    let inBlockReject = (error?: unknown) => { return error; };

    const inBlokcPromise  = new Promise<unknown>((resolve, reject) => {
      inBlockResolve = resolve;
      inBlockReject = reject;
    });


    // if job doesn't exisit, do noting.
    if (!record) return;

    if ((timestamp - record.lock) < 1000 * 60 * 5) {
      return;
    }
    // if job is locked or had been process, do noting.
    if (record.result === 'success') {
      return;
    }

    await MoveModel.update({ lock: timestamp }, { where: { id }});

    let __api: ApiPromise | null = null;
    let tx: SubmittableExtrinsic<'promise'> | null = null;

    try {
      if (from === 'laminar' && to === 'acala') {
        __api = this.#acalaApi;
        tx = await this.#acalaApi.tx.currencies.transfer(address, 'AUSD', amount).signAsync(this.#sender);
      }

      if (tx && __api) {
          await tx.send((result) => {
            if (result.isCompleted) {
              let flag = true;
              let errorMessage: DispatchError['type']= '';
              for (const event of result.events) {
                const { data, method, section } = event.event;

                if (section === 'system' && method === 'ExtrinsicFailed') {
                  const [dispatchError] = data as unknown as ITuple<[DispatchError]>;
          
                  if (dispatchError.isModule) {
                    try {
                      const mod = dispatchError.asModule;
                      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
                      const error = __api!.registry.findMetaError(new Uint8Array([Number(mod.index.toString()), Number(mod.error.toString())]));
          
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
                inBlockResolve();
              } else {
                inBlockReject(errorMessage);
              }
            }
            if (result.isError) {
              inBlockReject();
            }
          })

          await MoveModel.update({ result: 'sended' }, { where: { id }});

          await inBlokcPromise
            .then(() => {
              /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
              this.saveMoveJobResult(id, tx!.hash.toString(), true);
            }).catch((error) => {
              throw error;
            })
        }
    } catch(e) {
      console.log('error', e);
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      this.saveMoveJobResult(id, tx!.hash.toString(), false, e.toString());
    }
  }

  retryMoveJob (): void {
    interval(1000 * 60).subscribe(async (): Promise<void> => {
      const records = await MoveModel.findAll({
        limit: 10,
        where: {
          [Op.or]: [
            { result: 'record' },
            { result: 'failure' }
          ]
        }
      });

      for (const item of records) {
        this.#transferJob$.next(item);
      }
    });
  }

  async run(): Promise<void> {
    await this.#db.sync();

    await cryptoWaitReady();
    await this.initSender();

    await this.initApi();

    this.handleTranfer();
    this.retryMoveJob();

    this.#laminarSpider.use(async (data, next, context) => {
      context.db = this.#db;
      context.watcherAddress = this.#laminarWatcherAddress;
      await next();
    });

    this.#laminarSpider.use(async (data, next, context) => {
      if (data.result) {
        const temp = data.result.events
          // filter ausd transfer message
          .filter((event) => { 
            if (event.section === 'currencies' && event.method === 'Transferred') {
              const asset = event.args[0];
              const toAccount = event.args[2];

              return asset === 'AUSD' && toAccount === this.#laminarWatcherAddress;
            }

            return false;
          })
          .map(event => {
            return {
              id: `laminar_acala_${event.args[1]}_${event.index}_${data.blockNumber}`,

              from: 'laminar',
              to: 'acala',
              address: event.args[1],
              amount: event.args[3],
              result: 'record',

              createAtBlock: data.blockNumber,
              createAtBlockHash: data.result.hash,
              createAtChain: 'laminar'
            }
          });

          if (temp.length) {
            await MoveModel.bulkCreate(temp, { 
              ignoreDuplicates: true // Don't reset the exsit job
            });
          }

          for (const item of temp) {
            this.#transferJob$.next(item);
          }
      }

      await next();
    });

    this.#laminarSpider.start();
  }
}
