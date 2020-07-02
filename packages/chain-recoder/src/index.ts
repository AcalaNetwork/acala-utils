import { Sequelize } from "sequelize";
import { ChainSpider, SpiderController } from "@acala-weaver/chain-spider";
import { ScannerOptions } from "@open-web3/scanner/types";
import * as models from "@acala-weaver/database-models";
import { SyncModel } from "@acala-weaver/database-models";
import * as middleware from './middleware';
import * as jobs from './jobs';

interface Options extends ScannerOptions {
  db: Sequelize;
}

class Controller implements SpiderController {
  async getLatestBlock(): Promise<number> {
    const result = await SyncModel.max("blockNumber");

    return Number(result) || 0;
  }

  async onSyncSuccess(): Promise<boolean> {
    // do nothing
    return true;
  }


  async onSyncFailure(): Promise<boolean> {
    // do nothing
    return true;
  }
}

export class Recoder {
  #chainSpider!: ChainSpider;
  #db!: Sequelize;

  constructor(options: Options) {
    // init db
    this.#db = options.db;
    this.initDB();

    // init chainSpider
    this.#chainSpider = new ChainSpider({
      ...options,
      gap: 3600, // every 4min
      controller: new Controller(),
    });
  }

  initDB(): void {
    // base db
    models.initSyncModel(this.#db);
    models.initBlockModel(this.#db);
    models.initExtrinsicModel(this.#db);
    models.initEventModel(this.#db);

    // loans
    models.initLoanModel(this.#db);

    // accounts
    models.initAccountModel(this.#db);
    models.initTransferModel(this.#db);
  }

  async run(): Promise<void> {
    // prepare databse
    await this.#db.sync();

    // initialize context
    this.#chainSpider.use(async (data, next, context) => {
      context.db = this.#db;
      await next();
    });

    // sync middleware should be first!
    this.#chainSpider.use(middleware.sync);

    // base chain data
    this.#chainSpider.use(middleware.block);
    this.#chainSpider.use(middleware.extrinsic);
    this.#chainSpider.use(middleware.event);

    this.#chainSpider.use(middleware.account);
    this.#chainSpider.use(middleware.transfer);
    this.#chainSpider.use(middleware.loan);

    this.#chainSpider.addJob('*/1 * * * *', jobs.updateLoanInformation);

    return this.#chainSpider.start();
  }
}
