import { SubscribeBlock, SubscribeBlockError } from "@open-web3/scanner/types";
import Scanner from "@open-web3/scanner";
import { RecurrenceRule, RecurrenceSpecDateRange, RecurrenceSpecObjLit } from 'node-schedule';
import { Logger } from "@open-web3/util/logger";

export type Context = {
    scanner: Scanner;
    [k: string]: any;
};

export type Middleware = (
  data: SubscribeBlock | SubscribeBlockError,
  next: () => Promise<any>,
  context?: Context
) => Promise<void>;

export interface SpiderController {
  getLatestBlock(): Promise<number>;
  onSyncSuccess(block: number): Promise<boolean>;
  onSyncFailure(block: number): Promise<boolean>;
}

export type Job = (scanner: Scanner, logger: Logger) => Promise<void>;
export type Rule = RecurrenceRule | RecurrenceSpecDateRange | RecurrenceSpecObjLit | Date | string | number;