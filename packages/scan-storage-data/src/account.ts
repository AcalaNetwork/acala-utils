import { Block } from '@open-web3/scanner/types';
import Scanner from '@open-web3/scanner';
import { StorageKey } from '@polkadot/types';
import { OptionRatio, OptionRate, Balance } from '@acala-network/types/interfaces';
import { Fixed18, convertToFixed18, calcStableFeeAPR } from '@acala-network/app-util';
import { AccountInfo } from '@polkadot/types/interfaces';
import { OrmlAccountData } from '@open-web3/orml-types/interfaces/tokens'

/**
 * @name getAssets
 * @description get cdp total debit/collateral/config
 * @param address
 * @param block 
 */ export async function getAssets(address: string, block: Block, scanner: Scanner): Promise<Record<string, Fixed18>> {
    const { metadata, registry } = block.chainInfo;
    const blockAt = { blockNumber: block.number, blockHash: block.hash };
    const tokens = ['AUSD', 'DOT', 'LDOT', 'XBTC', 'RENBTC'];

    const acaBalanceKey = new StorageKey(registry, [metadata.query.system.account, address]);
    const [ausdBalanceKey, dotBalanceKey, ldotBalanceKey, xbtcBalanceKey, renBtcBalanceKey] = tokens.map((token) => {
        return new StorageKey(registry, [metadata.query.tokens.accounts, [address, token]]);
    });

    const [acaBalance, ausdBalance, dotBalance, ldotBalance, xbtcBalance, renBtcBalance] = await Promise.all([
        scanner.getStorageValue<AccountInfo>(acaBalanceKey, blockAt),
        scanner.getStorageValue<OrmlAccountData>(ausdBalanceKey, blockAt),
        scanner.getStorageValue<OrmlAccountData>(dotBalanceKey, blockAt),
        scanner.getStorageValue<OrmlAccountData>(ldotBalanceKey, blockAt),
        scanner.getStorageValue<OrmlAccountData>(xbtcBalanceKey, blockAt),
        scanner.getStorageValue<OrmlAccountData>(renBtcBalanceKey, blockAt),
    ]);

    return {
        aca: acaBalance ? convertToFixed18(acaBalance.data.free): Fixed18.ZERO,
        ausd: ausdBalance ? convertToFixed18(ausdBalance.free): Fixed18.ZERO,
        dot: dotBalance ? convertToFixed18(dotBalance.free): Fixed18.ZERO, 
        ldot: ldotBalance ? convertToFixed18(ldotBalance.free): Fixed18.ZERO,
        xbtc: xbtcBalance? convertToFixed18(xbtcBalance.free): Fixed18.ZERO,
        renbtc: renBtcBalance ? convertToFixed18(renBtcBalance.free): Fixed18.ZERO,
    }
}
