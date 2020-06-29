import { Sequelize } from "sequelize/types";
import Scanner from "@open-web3/scanner";
import { Event, Block, Extrinsic } from "@open-web3/scanner/types";

import { HandlerConfig } from './scanner';

export abstract class BaseService {
    public name: string;
    db: Sequelize;
    scanner: Scanner;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        this.name = name;
        this.db = db;
        this.scanner = scanner;
    }

    // initialize databse
    abstract initDB(sequelize: Sequelize): void;

    // execute when before sync block
    async onSyncBlockStart?(blockNum: number, config?: HandlerConfig): Promise<void>;

    // execute when after sync block success
    async onSyncBlockSuccess?(block: Block, config?: HandlerConfig): Promise<void>;

    // execute when sync block occur error
    async onSyncBlockError?(blockNum: number, config?: HandlerConfig): Promise<void>;

    // execute when receive new block
    async onReceiveNewBlock?(block: Block, config?: HandlerConfig): Promise<void>;

    // execute when receive Event
    async onEvent?(event: Event, block: Block, config?: HandlerConfig): Promise<void>;

    // execute when receive extrinsic
    async onExtrinsic?(extrinsic: Extrinsic, index: number, block: Block, config?: HandlerConfig): Promise<void>;
};