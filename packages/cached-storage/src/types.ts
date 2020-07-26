export interface BlockData {
  blockHash: string;
  blockNumber: number | string;
  timestamp: number | string;
  parentHash: string;
  author: string;
}

export interface ExtrinsicData {
  hash: string;
  blockHash: string;
  blockNumber: number | string;
  index: number | string;
  section: string;
  method: string;
  args: unknown;
  result?: boolean;

  isDispatched: boolean;
}

export interface EventData {
  blockHash: string;
  blockNumber: string;
  index: number | string;
  section: string;
  method: string;
  args: unknown;
}

export type WithNull<T>  = T | null;

export interface BlockResult {
  blockNumber: number;
  block: WithNull<BlockData>;
  events: EventData[];
  extrinsics: ExtrinsicData[];
}
