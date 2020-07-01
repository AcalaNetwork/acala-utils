import { Block } from '@open-web3/scanner/types';
import { StorageKey } from '@polkadot/types';
import { Vec } from '@polkadot/types';
import { TimestampedValue, Balance } from '@open-web3/orml-types/interfaces';
import Scanner from '@open-web3/scanner';

/**
 * @name getAddressAssetBalance
 * @description get asset balance of address
 * @param account 
 * @param asset 
 * @param block 
 * @param scanner 
 */
async function getAddressAssetBalance (account: string, asset: string, block: Block, scanner: Scanner): Promise<number> {
    // native token
    return 0;
}