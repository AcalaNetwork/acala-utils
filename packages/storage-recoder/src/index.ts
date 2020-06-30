import * as Influx from 'influx';
import { ChainSpider, SpiderController } from "@acala-weaver/chain-spider";
import { ScannerOptions } from "@open-web3/scanner/types";

import schema from './influx-schema';
import blockMiddleware from './middleware/block';
import extrinsicMiddleware from './middleware/extrinsic';

interface Options extends ScannerOptions {
  host: string;
}

class Controller implements SpiderController {
  async getLatestBlock (): Promise<number> {
    return 0;
  }

  async onSyncSuccess (): Promise<boolean> {
    return true;
  }

  async onSyncFailure(): Promise<boolean> {
    return true;
  }
}

function initDB (host: string): Influx.InfluxDB {
  return new Influx.InfluxDB({
    host: host,
    database: 'acala',
    port: 8086,
    schema 
   })
}

export class Recoder {
  #chainSpider!: ChainSpider;
  #db!: Influx.InfluxDB;

  constructor(options: Options) {
    this.#chainSpider = new ChainSpider({
      ...options,
      controller: new Controller()
    });
    this.#db = initDB(options.host);
  }

  run (): Promise<void> {
    this.#chainSpider.use(async (data, next, context) => {
      context.db = this.#db;
      await next();
    });

    this.#chainSpider.use(blockMiddleware);
    this.#chainSpider.use(extrinsicMiddleware);

    return this.#chainSpider.start();
  }
}