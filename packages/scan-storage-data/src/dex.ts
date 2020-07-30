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

export async function getDex (asset: string, block: Block, scanner: Scanner): Promise<{ other: Fixed18, base: Fixed18 }> {
    const { metadata, registry } = block.chainInfo;
    const blockAt = { blockNumber: block.number, blockHash: block.hash };

    const key = new StorageKey(registry, [metadata.query.dex.liquidityPool, asset]);

    const pool = await scanner.getStorageValue<[Balance, Balance]>(key, blockAt);

    return {
        other: convertToFixed18(pool[0]),
        base: convertToFixed18(pool[1])
    };
}

export async function getDexShares (address: string, block: Block, scanner: Scanner) {
    const { metadata } = block.chainInfo;

    const dexCurrencies = metadata.consts.dex.enabledCurrencyIds;

    const data = await Promise.all(dexCurrencies.map((asset) => {
        return getDexShareHolderInfo(asset.toString(), address, block, scanner);
    }));

    return data;
}

export async function getDexReward (asset: string, address: string, block: Block, scanner: Scanner) {
    const { metadata, registry } = block.chainInfo;
    const blockAt = { blockNumber: block.number, blockHash: block.hash };

    const shareKey = new StorageKey(registry, [metadata.query.dex.shares, [asset, address]]);
    const totalShareKey = new StorageKey(registry, [metadata.query.dex.totalShares, asset]);
    const totalInterestKey = new StorageKey(registry, [metadata.query.dex.totalInterest, asset]);
    const withdrawnInterestKey = new StorageKey(registry, [metadata.query.dex.withdrawnInterest, [asset, address]]);

    const [_share, _totalShare, _totalInterest, _withdrawnInterest] = await Promise.all([
        scanner.getStorageValue<Balance>(shareKey, blockAt),
        scanner.getStorageValue<Balance>(totalShareKey, blockAt),
        scanner.getStorageValue<[Balance]>(totalInterestKey, blockAt),
        scanner.getStorageValue<Balance>(withdrawnInterestKey, blockAt),
    ]);

    const share = convertToFixed18(_share);
    const totalShare = convertToFixed18(_totalShare);
    const shareRatio = totalShare.isNaN() ? Fixed18.ZERO : share.div(totalShare);
    const totalInterest = _totalInterest ? convertToFixed18(_totalInterest[0]) : Fixed18.ZERO;
    const withdrawnInterest = _withdrawnInterest ? convertToFixed18(_withdrawnInterest) : Fixed18.ZERO;

    return {
        asset,
        reward: shareRatio.mul(totalInterest).sub(withdrawnInterest)
    };
}

export async function getDexRewards (address: string, block: Block, scanner: Scanner) {
    const { metadata } = block.chainInfo;

    const dexCurrencies = metadata.consts.dex.enabledCurrencyIds;

    const data = await Promise.all(dexCurrencies.map((asset) => {
        return getDexReward(asset.toString(), address, block, scanner);
    }));

    return data;
}