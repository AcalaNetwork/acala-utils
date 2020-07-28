import { DispatchableCall } from "@open-web3/indexer/models";

export interface Block {
    blockHash: string;
    blockNumber: number;
    timestamp: number;
    parentHash: string;
    author: string;
}

export interface ChainEvent {
    id: string;
    blockHash: string;
    blockNumber: number;
    index: number;
    section: string;
    method: string;
    args: [any];
    phaseType: string;
    phaseIndex: number;
}

export interface Extrinsic {
    id: string;
    hash: string;
    blockHash: string;
    blockNumber: number;
    index: number;
    section: string;
    method: string;
    args: any;
    nonce: number;
    tip: string;
    signer: string;
    result: string;
}

export interface DispatchCall {
    id: string;
    section: string;
    method: string;
    args: any;
    extrinsic: string;
    parent: string;
    origin: string;
}

export interface ResultData {
    block: Block;
    events: ChainEvent[];
    extrinsics: Extrinsic[];
    dispatchableCalls: DispatchableCall[];
}

export interface ContextData {
    blockNumber: number;
    data: ResultData;
}

export type Middleware = (context: ContextData, next: () => Promise<void>) => Promise<void>;