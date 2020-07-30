import { Block } from '@open-web3/scanner/types';
import Scanner from '@open-web3/scanner';
import { StorageKey } from '@polkadot/types';
import { OptionRatio, OptionRate, Balance } from '@acala-network/types/interfaces';
import { Fixed18, convertToFixed18, calcStableFeeAPR } from '@acala-network/app-util';

interface CollateralParams {
    maximumTotalDebitValue: Balance;
    stabilityFee: OptionRate;
    liquidationRatio: OptionRatio;
    liquidationPenalty: OptionRate;
    requiredCollateralRatio: OptionRatio;
}

interface CDPData {
    asset: string;
    totalDebit: Fixed18;
    totalCollateral: Fixed18;
    debitExchangeRate: Fixed18;
    maximumTotalDebitValue: Fixed18;
    minimumDebitValue: Fixed18;
    stabilityFee: Fixed18;
    liquidationRatio: Fixed18;
    liquidationPenalty: Fixed18;
    requiredCollateralRatio: Fixed18;
    stableFeeAPR: Fixed18;
}

/**
 * @name getCDP
 * @description get cdp total debit/collateral/config
 * @param asset 
 * @param block 
 */ export async function getCDP(asset: string, block: Block, scanner: Scanner): Promise<CDPData> {
    const { metadata, registry } = block.chainInfo;
    const blockAt = { blockNumber: block.number, blockHash: block.hash };
    const constants = metadata.consts.cdpEngine;

    const totalDebitStorageKey = new StorageKey(registry, [metadata.query.loans.totalDebits, asset]);
    const totalCollateralStorageKey = new StorageKey(registry, [metadata.query.loans.totalCollaterals, asset]);
    const debitExchangeRateStorageKey = new StorageKey(registry, [metadata.query.cdpEngine.debitExchangeRate, asset]);
    const globalStabilityFeeStorageKey = new StorageKey(registry, metadata.query.cdpEngine.globalStabilityFee);
    const collateralParamsStorageKey = new StorageKey(registry, [metadata.query.cdpEngine.collateralParams, asset]);
    const [totalDebit, totalCollateral, debitExchangeRate, globalStabilityFee, collateralParams] = await Promise.all([
        scanner.getStorageValue<Balance>(totalDebitStorageKey, blockAt),
        scanner.getStorageValue<Balance>(totalCollateralStorageKey, blockAt),
        scanner.getStorageValue<Balance>(debitExchangeRateStorageKey, blockAt),
        scanner.getStorageValue<Balance>(globalStabilityFeeStorageKey, blockAt),
        scanner.getStorageValue<CollateralParams>(collateralParamsStorageKey, blockAt),
    ]);

    const stableFee = convertToFixed18(collateralParams.stabilityFee).add(convertToFixed18(globalStabilityFee));
    const expectedBlockTime = Number(metadata.consts.babe.expectedBlockTime.toString());

    return {
        asset,
        totalDebit: convertToFixed18(totalDebit),
        totalCollateral: convertToFixed18(totalCollateral),
        debitExchangeRate: convertToFixed18(debitExchangeRate.isEmpty ? constants.defaultDebitExchangeRate : debitExchangeRate),
        liquidationPenalty: convertToFixed18(collateralParams.liquidationPenalty.isEmpty ? constants.defaultLiquidationPenalty : collateralParams.liquidationPenalty),
        liquidationRatio: convertToFixed18(collateralParams.liquidationRatio.isEmpty ? constants.defaultLiquidationRatio : collateralParams.liquidationRatio),
        requiredCollateralRatio: convertToFixed18(collateralParams.requiredCollateralRatio),
        stabilityFee: stableFee,
        maximumTotalDebitValue: convertToFixed18(collateralParams.maximumTotalDebitValue),
        minimumDebitValue: convertToFixed18(constants.minimumDebitValue),
        stableFeeAPR: calcStableFeeAPR(stableFee, expectedBlockTime)
    };
}

interface LoanData {
    asset: string;
    debit: Fixed18;
    collateral: Fixed18;
    debitExchangeRate: Fixed18;
}

/**
 * @name getLoan
 * @param block 
 * @param currency 
 * @param account 
 */
export async function getLoanInfo(asset: string, account: string, block: Block, scanner: Scanner): Promise<LoanData> {
    const { metadata, registry } = block.chainInfo;
    const blockAt = { blockNumber: block.number, blockHash: block.hash };
    const constants = metadata.consts.cdpEngine;

    const debitStorageKey = new StorageKey(registry, [metadata.query.loans.debits, [asset, account]]);
    const collateralStorageKey = new StorageKey(registry, [metadata.query.loans.collaterals, [account, asset]]);
    const debitExchangeRateStorageKey = new StorageKey(registry, [metadata.query.cdpEngine.debitExchangeRate, asset]);

    const [debit, collateral, debitExchangeRate] = await Promise.all([
        scanner.getStorageValue<Balance>(debitStorageKey, blockAt),
        scanner.getStorageValue<Balance>(collateralStorageKey, blockAt),
        scanner.getStorageValue<Balance>(debitExchangeRateStorageKey, blockAt),
    ]);

    return {
        asset,
        debit: convertToFixed18(debit),
        collateral: convertToFixed18(collateral),
        debitExchangeRate: convertToFixed18(debitExchangeRate.isEmpty ? constants.defaultDebitExchangeRate : debitExchangeRate),
    };
}

export async function getLoans (account: string, block: Block, scanner: Scanner) {
    const { metadata } = block.chainInfo;
    const loansCurrency = metadata.consts.cdpEngine.collateralCurrencyIds;
    const data = await Promise.all(loansCurrency.map((asset) => {
        return getLoanInfo(asset.toString(), account, block, scanner);
    }));

    return data;
}