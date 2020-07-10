import { Block } from '@open-web3/scanner/types';
import Scanner from '@open-web3/scanner';
import { StorageKey } from '@polkadot/types';
import { Balance } from '@acala-network/types/interfaces';
import { Fixed18, convertToFixed18 } from '@acala-network/app-util';
import { getAssetPrice } from './price';

interface DexShareHolderInfo {
    asset: string;
    address: string;
    share: Fixed18;
    totalShare: Fixed18;
    shareValue: Fixed18;
    shareRatio: Fixed18;
}

export async function getDexShareHolderInfo (asset: string, address: string, block: Block, scanner: Scanner): Promise<DexShareHolderInfo> {
    const { metadata, registry } = block.chainInfo;
    const blockAt = { blockNumber: block.number, blockHash: block.hash };

    const shareKey = new StorageKey(registry, [metadata.query.dex.shares, [asset, address]]);
    const totalShareKey = new StorageKey(registry, [metadata.query.dex.totalShares, asset]);
    const liquidityPoolKey = new StorageKey(registry, [metadata.query.dex.liquidityPool, asset]);

    const [_share, _totalShare, liquidityPool] = await Promise.all([
        scanner.getStorageValue<Balance>(shareKey, blockAt),
        scanner.getStorageValue<Balance>(totalShareKey, blockAt),
        scanner.getStorageValue<[Balance, Balance]>(liquidityPoolKey, blockAt),
    ]);

    const price = await getAssetPrice(asset, block, scanner);

    const share = convertToFixed18(_share);
    const totalShare = convertToFixed18(_totalShare);
    const shareRatio = totalShare.isNaN() ? Fixed18.ZERO : share.div(totalShare);
    const primaryAssetValue = shareRatio.mul(convertToFixed18(liquidityPool[0])).mul(price) || Fixed18.ZERO;
    const baseAssetValue = shareRatio.mul(convertToFixed18(liquidityPool[1]));

    return {
        asset,
        address,
        share,
        totalShare,
        shareValue: primaryAssetValue.add(baseAssetValue),
        shareRatio
    };
}