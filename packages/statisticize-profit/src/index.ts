import Scanner from "@open-web3/scanner";
import { getAssets, getLoans, getDexShares, getDexRewards } from '@acala-weaver/scan-storage-data';
import { Block } from "@open-web3/scanner/types";

async function getAccountValue (address: string, block: Block, scanner: Scanner) {
    // get account balance
    const assets = await getAssets(address, block, scanner);

    // get account loan position
    const loans = await getLoans(address, block, scanner);

    // get account dex share
    const shares = await getDexShares(address, block, scanner);

    // get account dex reward
    const reward = await getDexRewards(address, block, scanner);

    return {
        assets,
        loans,
        shares,
        reward
    };
};


export async function run (scanner: Scanner, startBlock: number, endBlock: number) {
    await scanner.wsProvider.connect();

    startBlock = 451306;
    const startBlockDetail = await scanner.getBlockDetail({ blockNumber: startBlock });
    const endBlockDetail = await scanner.getBlockDetail({ blockNumber: startBlock });

    const values = await getAccountValue('5ES9fyfV56kkEP1qazNzN1S6YwbSTfFWp2Q3i4QG4eyT2Ng8', startBlockDetail, scanner);

    values.reward.map((item) => console.log(item.reward.toString()));
    values.shares.map((item) => console.log(item.shareValue.toString()));
}