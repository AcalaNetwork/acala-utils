import { SubscribeBlock, SubscribeBlockError } from "@open-web3/scanner/types";
import Scanner from "@open-web3/scanner";

export type Context = {
    scanner: Scanner;
    gap: number;
    [k: string]: any;
};

export type Middleware =
  | ((data: SubscribeBlock | SubscribeBlockError) => Promise<void>)
  | ((
      data: SubscribeBlock | SubscribeBlockError,
      next: () => Promise<any>
    ) => Promise<void>)
  | ((
      data: SubscribeBlock | SubscribeBlockError,
      next: () => Promise<any>,
      context: Context
    ) => Promise<void>);

export interface SpiderController {
  getLatestBlock(): Promise<number>;
  onSyncSuccess(block: number): Promise<boolean>;
  onSyncFailure(block: number): Promise<boolean>;
}
