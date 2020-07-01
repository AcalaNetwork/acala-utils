import { Block } from '@open-web3/scanner/types';
import { StorageKey } from '@polkadot/types';
import { Vec } from '@polkadot/types';
import { TimestampedValue, Balance } from '@open-web3/orml-types/interfaces';
import { calcCommunalBonded, calcCommunalTotal, calcLiquidExchangeRate, convertToFixed18, Fixed18 } from '@acala-network/app-util';

import Scanner from '@open-web3/scanner';

/**
 * @name getAssetPrice
 * @description get asset price from chain
 * @param asset 
 * @param block 
 */
export async function getAssetPrice(asset: string, block: Block, scanner: Scanner): Promise<Fixed18> {
  const { metadata, registry } = block.chainInfo;

  // get aca price
  if (asset === 'ACA') {
    const liquidityPoolKey = new StorageKey(registry, [metadata.query.dex.liquidityPool, asset]);
    const liquidityPool = await scanner.getStorageValue<Vec<Balance>>(liquidityPoolKey, { blockNumber: block.number });

    return liquidityPool.isEmpty ? Fixed18.ZERO : convertToFixed18(liquidityPool[0]).div(convertToFixed18(liquidityPool[1]));
  }

  // get ldot price
  if (asset === "LDOT") {
    const liquidTokenIssuanceKey = new StorageKey(registry, [metadata.query.tokens.totalIssuance, asset,]);
    const totalBondedKey = new StorageKey(registry, metadata.query.stakingPool.totalBonded);
    const nextEraUnbondKey = new StorageKey(registry, metadata.query.stakingPool.nextEraUnbond);
    const freeKey = new StorageKey(registry, metadata.query.stakingPool.freeUnbonded); const unbondingToFreeKey = new StorageKey(registry, metadata.query.stakingPool.unbondingToFree);
    const dotPriceKey = new StorageKey(registry, [metadata.query.oracle.values, "DOT"]); // get dot price

    const [
      dotPrice,
      liquidTokenIssuance,
      totalBonded,
      nextEraUnbond,
      free,
      unbondingToFree,
    ] = await Promise.all([
      scanner.getStorageValue<TimestampedValue>(dotPriceKey, { blockNumber: block.number }),
      scanner.getStorageValue<Balance>(liquidTokenIssuanceKey, { blockNumber: block.number }),
      scanner.getStorageValue<Balance>(totalBondedKey, { blockNumber: block.number, }),
      scanner.getStorageValue<[Balance, Balance]>(nextEraUnbondKey, { blockNumber: block.number }),
      scanner.getStorageValue<Balance>(freeKey, { blockNumber: block.number, }),
      scanner.getStorageValue<Balance>(unbondingToFreeKey, { blockNumber: block.number }),
    ]);

    const communalBonded = calcCommunalBonded(convertToFixed18(totalBonded), convertToFixed18(nextEraUnbond[1]));
    const communalTotal = calcCommunalTotal(communalBonded, convertToFixed18(free), convertToFixed18(unbondingToFree));
    const exchangeRate = calcLiquidExchangeRate(convertToFixed18(liquidTokenIssuance), communalTotal,
      convertToFixed18(block.chainInfo.metadata.consts.stakingPool.defaultExchangeRate)
    );
    const _dotPrice = convertToFixed18(dotPrice.isEmpty ? 0 : dotPrice.value);
    const result = _dotPrice.mul(exchangeRate);

    return result;
  }

  // normal asset price
  const storageKey = new StorageKey(registry, [
      metadata.query.oracle.values,
      asset,
  ]);
  const result = await scanner.getStorageValue<TimestampedValue>(storageKey, { blockNumber: block.number });

  return result.isEmpty ? Fixed18.ZERO : convertToFixed18(result.value);
}
