import { Sequelize } from "sequelize";
import * as models from "@acala-weaver/database-models";
import * as middleware from "./middleware";
import { CachedStorage, CachedStorageConfig } from "@acala-weaver/cached-storage";
import * as jobs from "./jobs";
import Logger from "@open-web3/util/logger";

interface Options extends CachedStorageConfig {
  recoderDB: Sequelize;
}

const logger = Logger.createLogger('chain-recoder');
export class Recoder {
  #storage !: CachedStorage;
  #recoderDB!: Sequelize;

  constructor(options: Options) {
    // init db
    this.#recoderDB = options.recoderDB;
    this.initDB();

    // init storage
    this.#storage = new CachedStorage({
      ...options
    });
  }

  initDB(): void {
    // loans
    models.initLoanModel(this.#recoderDB);

    // accounts
    models.initAccountModel(this.#recoderDB);
    models.initTransferModel(this.#recoderDB);

    // auction
    models.initAuctionModel(this.#recoderDB);
  }

  async run(): Promise<void> {
    logger.info('process start');
    // prepare databse
    await this.#recoderDB.sync();
    await this.#storage.prepare();

    // update loan information every 4 hour
    // this.#storage.addJob("*/4 * * *", jobs.updateLoanInformation);
    const latest = await this.#storage.get('RECODER_LATEST');
    this.#storage.start(latest ? Number(latest) : 0).subscribe((data) => {
      logger.info(`process #${data.blockNumber}`);
      middleware.account(data);
      middleware.transfer(data);
      middleware.loan(data);
      middleware.auction(data);
      this.#storage.set('RECODER_LATEST', data.blockNumber.toString());
    });
  }
}
