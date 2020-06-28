import { Sequelize, Transaction } from 'sequelize';

import { AnyFunction } from '@polkadot/types/types';
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
import { numberToLevel } from '@open-web3/util/logger';

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
            // @ts-ignore
            return typeof(service[method]) === 'function' ? service[method](...data) : undefined;
        }));
    }

    // add service
    public addService(name: string, Service: typeof BaseService) {
        // ensure module doesn't exit
        const _index = this.subServices.findIndex((item): boolean => item.name === name);

        assert(_index === -1, `Aleardy have module:${name} at position:${_index}`);

        // @ts-ignore
        this.subServices.push(new Service(name, this.db, this._scanner));
    }

    async start () {
        logger.info('prepare scanner');
        await this.processSubService('initDB', [this.db]);
        await this.db.sync();
        await this._scanner.wsProvider.connect();

        const startBlockNum = await this.getLatestSyncBlock();
        logger.info(`scanner start at#${startBlockNum}`);

        this._scanner.subscribe({ start: startBlockNum,  concurrent: 1 }).subscribe(this.syncBlock);
    }

    async getLatestSyncBlock (): Promise<number> {
        const syncService = this.subServices.find(item => item.name === 'sync-service');

        return (syncService as SyncService).getLatestBlockNumber();
    }

    async syncBlock (detail: SubscribeBlock | SubscribeBlockError) {
        const transition = await this.db.transaction({ autocommit: false });

        try {
            if (detail.result) {
                await this.handleBlock(detail.result, { transition });
                await this.handleEvent(detail.result, { transition });
                await this.handleExtrinsic(detail.result, { transition });
                await this.handleSyncBlockSuccess(detail.result, { transition });

                await transition.commit();
                logger.info(`process #${detail.blockNumber} sucess`);
            } else {
                await this.handleSyncBlockError(detail.blockNumber, { transition });
                logger.error(`process #${detail.blockNumber} failed`);
            }
        } catch (e) {
            logger.error(e);
            await transition.rollback();
        }
    }

    async handleSyncBlockStart (blockNum: number, config: HandlerConfig) {
        await this.processSubService('onSyncBlockStart', [blockNum, config]);
    }

    async handleSyncBlockError (blockNum: number, config: HandlerConfig) {
        await this.processSubService('onSyncBlockError', [blockNum, config]);
    }

    async handleSyncBlockSuccess (block: SubscribeBlock['result'], config: HandlerConfig) {
        await this.processSubService('onSyncBlockSuccess', [block, config]);
    }

    async handleBlock (detail: SubscribeBlock['result'], config: HandlerConfig) {
        await this.processSubService('onSyncBlock', [detail, config]);
    }

    async handleExtrinsic (detail: SubscribeBlock['result'], config: HandlerConfig) {
        await Promise.all(detail.extrinsics.map((extrinsic, index) => this.processSubService('onExtrinsic', [extrinsic, index, detail, config])));
    }

    async handleEvent (detail: SubscribeBlock['result'], config: HandlerConfig) {
        await Promise.all(detail.events.map((event, index) => this.processSubService('onEvent', [event, detail, config])));
    }
}
