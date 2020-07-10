import { Block } from "@open-web3/scanner/types";
import { get } from 'lodash';
import Scanner from '@open-web3/scanner';
import { StorageKey } from '@polkadot/types';
import { StorageEntry } from "@polkadot/types/primitive/StorageKey";

export async function getStorageValue<T> (path: string, block: Block, scanner: Scanner, params?: string[]): Promise<T> {
    const { metadata, registry } = block.chainInfo;
    const blockAt = { blockNumber: block.number, blockHash: block.hash };

    const _path = get(metadata, `query.${path}`);

    if (!_path) {
        throw new Error(`can't found ${path} in metadata`);
    }
    
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const _params: StorageEntry | [StorageEntry, any] = params ? [_path, ...params] : _path;

    const key = new StorageKey(registry, _params);

    return scanner.getStorageValue<T>(key, blockAt);
}