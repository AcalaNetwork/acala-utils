import { getAssetPrice, getCDP, getLoanInfo } from "@acala-weaver/scan-storage-data";
import { LoanModel } from "@acala-weaver/database-models";
import Scanner from "@open-web3/scanner";
import { Fixed18 } from "@acala-network/app-util";
import { Logger } from "@open-web3/util/logger";

export async function updateLoanInformation (scanner: Scanner, logger: Logger): Promise<void> {
    logger.info('jobs updateLoanInformation start');

    const block = await scanner.getBlockDetail();
    const assets = block.chainInfo.registry.createType('CurrencyId').defKeys;

    const getPrice = async (asset: string): Promise<[string, Fixed18]> => {
        const price = await getAssetPrice(asset, block, scanner);
        return [asset, price];
    };

    const _prices = await Promise.all(assets.map((asset) => getPrice(asset)));
    const prices = new Map<string, Fixed18>(_prices);

    const loans = await LoanModel.findAll();

    const process = async (model: LoanModel): Promise<void> => {
        const cdp = await getCDP(model.asset, block, scanner);
        const loanInfo = await getLoanInfo(model.asset, model.address, block, scanner);

        const collateralValue = loanInfo.collateral.mul(prices.get(model.asset) || Fixed18.ZERO);
        const debitlValue = loanInfo.debit.mul(cdp.debitExchangeRate);

        await LoanModel.update({
            collateral: loanInfo.collateral.toNumber(18, 3) || 0,
            debit: loanInfo.debit.toNumber(18, 3) || 0,
            collateralValue:  collateralValue.toNumber(18, 3) || 0,
            debitlValue: debitlValue.toNumber(18, 3) || 0,
            collateralRatio: collateralValue.div(debitlValue).toNumber(18, 3) || 0,
            updateAtBlock: block.number
        }, {
            where: {
                asset: model.asset,
                address: model.address
            }
        });
    };

    await Promise.all(loans.map((model) => process(model)));

    logger.info('jobs updateLoanInformation end');
}
