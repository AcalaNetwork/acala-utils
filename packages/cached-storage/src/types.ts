export interface BlockData {
  blockHash: string;
  blockNumber: number;
  timestamp: number;
  parentHash: string;
  author: string;
}

export interface ExtrinsicData {
  hash: string;
  blockHash: string;
  blockNumber: number;
  index: number;
  section: string;
  signer: string;
  method: string;
  args: Record<string, any> | undefined;
  result?: string;

  isDispatched?: boolean;
  parentHash?: string;
  dispatchIndex?: number;
}

export interface EventData {
  blockHash: string;
  blockNumber: string;
  index: number;
  section: string;
  method: string;
  args: any[] | undefined;
}

export type WithNull<T>  = T | null;

export interface BlockResult {
  blockNumber: number;
  block: WithNull<BlockData>;
  events: EventData[];
  extrinsics: ExtrinsicData[];
}
