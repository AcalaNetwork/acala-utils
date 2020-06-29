import { Sequelize } from 'sequelize';

import { assert } from '@polkadot/util';
import OriginScanner from '@open-web3/scanner';
import {
  SubscribeBlock,
  SubscribeBlockError,
  ScannerOptions
} from '@open-web3/scanner/types';
import { defaultLogger } from '@open-web3/util';

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { SyncService, BlockService, ExtrinsicService } from '@acala-weaver/scanner-sub-service';

interface SyncControllerConfig extends ScannerOptions {
    db: Sequelize;
}

type BaseServiceMethods = keyof BaseService;

const logger = defaultLogger.createLogger('scanner');

export class Scanner {
    private db: Sequelize; // db
    private _scanner: OriginScanner; // scanner
    private subServices: BaseService[]; // modules_list

    constructor(config: SyncControllerConfig) {
        this.db = config.db;
        this.subServices = [];
        this._scanner = new OriginScanner(config);
        
        // initialize sub services
        this.addService('sync-service', SyncService);
        this.addService('block-service', BlockService);
        this.addService('extrinsic-service', ExtrinsicService);

        this.syncBlock = this.syncBlock.bind(this);
    }

    private async processSubService<T extends BaseService, U extends BaseServiceMethods>(method: U, data: any[]) {
        await Promise.all(this.subServices.map((service) => {
            /* eslint-disable-next-line */
            // @ts-ignore
            return typeof(service[method]) === 'function' ? service[method](...data) : undefined;
        }));
    }

    // add service
    public addService(name: string, Service: typeof BaseService): void {
        // ensure module doesn't exit
        const _index = this.subServices.findIndex((item): boolean => item.name === name);

        assert(_index === -1, `Aleardy have module:${name} at position:${_index}`);

        /* eslint-disable-next-line */
        // @ts-ignore
        this.subServices.push(new Service(name, this.db, this._scanner));
    }

    async start (): Promise<void> {
        logger.info('prepare scanner');
        await this.processSubService('initDB', [this.db]);
        await this.db.sync();
        await this._scanner.wsProvider.connect();

        const startBlockNum = await this.getLatestSyncBlock();
        logger.info(`scanner start at#${startBlockNum}`);

        this._scanner.subscribe({ start: startBlockNum,  concurrent: 10 }).subscribe(this.syncBlock);
    }

    async getLatestSyncBlock (): Promise<number> {
        const syncService = this.subServices.find(item => item.name === 'sync-service');

        return (syncService as SyncService).getLatestBlockNumber();
    }

    async syncBlock (detail: SubscribeBlock | SubscribeBlockError): Promise<void> {
        const transition = await this.db.transaction({ autocommit: false });

        try {
            if (detail.result) {
                await this.onEvent(detail.result, { transition });
                await this.onExtrinsic(detail.result, { transition });
                await this.onSyncBlockSuccess(detail.result, { transition });

                await transition.commit();
                logger.info(`process #${detail.blockNumber} sucess`);
            } else {
                await this.onSyncBlockError(detail.blockNumber, { transition });
                logger.error(`process #${detail.blockNumber} failed`);
            }
        } catch (e) {
            logger.error(e);
            await transition.rollback();
        }
    }

    async onSyncBlockStart (blockNum: number, config: HandlerConfig): Promise<void> {
        await this.processSubService('onSyncBlockStart', [blockNum, config]);
    }

    async onSyncBlockError (blockNum: number, config: HandlerConfig): Promise<void> {
        await this.processSubService('onSyncBlockError', [blockNum, config]);
    }

    async onSyncBlockSuccess (block: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        await this.processSubService('onSyncBlockSuccess', [block, config]);
    }
   
    async onExtrinsic (detail: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        await Promise.all(detail.extrinsics.map((extrinsic, index) => this.processSubService('onExtrinsic', [extrinsic, index, detail, config])));
    }

    async onEvent (detail: SubscribeBlock['result'], config: HandlerConfig): Promise<void> {
        await Promise.all(detail.events.map((event, index) => this.processSubService('onEvent', [event, detail, config])));
    }
}
