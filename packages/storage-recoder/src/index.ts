import * as Influx from 'influx';
import { ChainSpider, SpiderController } from "@acala-weaver/chain-spider";
import { ScannerOptions } from "@open-web3/scanner/types";

import schema from './influx-schema';
import * as middleware from './middleware';

interface Options extends ScannerOptions {
  host: string;
}

class Controller implements SpiderController {
  #db: Influx.InfluxDB;

  constructor (db: Influx.InfluxDB) {
    this.#db = db;
  }

  async getLatestBlock (): Promise<number> {
    const result = await this.#db.query('SELECT max("blockNumber") FROM "sync" WHERE "success"=true');

    if (result.length) {
      return (result as any[])[0].max;
    }

    return 0;
  }

  async onSyncSuccess (blockNumber: number): Promise<boolean> {
    await this.#db.writePoints([
      {
        measurement: 'sync',
        fields: {
          blockNumber,
          success: true
        },
        tags: { blockNumber: blockNumber.toString() }
      },
    ]);

    return true;
  }

  async onSyncFailure(blockNumber: number): Promise<boolean> {
    await this.#db.writePoints([
      {
        measurement: 'sync',
        fields: { success: true },
        tags: { blockNumber: blockNumber.toString() }
      },
    ]);

    return true;
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
    this.#db = initDB(options.host);
    this.#chainSpider = new ChainSpider({
      ...options,
      controller: new Controller(this.#db),
      gap: 20 * 60 / 4 // blocks in 20min
    });
  }

  run (): Promise<void> {

    // set db to context
    this.#chainSpider.use(async (data, next, context) => {
      context.db = this.#db;
      await next();
    });

    // ensure that block is the first middlware!
    this.#chainSpider.use(middleware.block);
    this.#chainSpider.use(middleware.extrinsic);
    this.#chainSpider.use(middleware.event);

    this.#chainSpider.use(middleware.price);
    this.#chainSpider.use(middleware.cdp);
    this.#chainSpider.use(middleware.collateralAuction);
    this.#chainSpider.use(middleware.debitAuction);
    this.#chainSpider.use(middleware.surplusAuction);

    return this.#chainSpider.start();
  }
}