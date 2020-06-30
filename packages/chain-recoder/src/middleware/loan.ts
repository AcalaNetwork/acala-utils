import { StorageKey } from '@polkadot/types';
import Scanner from '@open-web3/scanner';
import { Block } from "@open-web3/scanner/types";
import { Balance } from '@acala-network/types/interfaces/runtime';

import { LoanModel } from '@acala-weaver/database-models';
import { Middleware } from '@acala-weaver/chain-spider';

export const loan: Middleware = async (data, next, context) => {
    const getLoanInfo = async (block: Block, currency: string, account: string): Promise<{ debit: string, collateral: string}> => {
        const { metadata, registry } = block.chainInfo;
        const debitStorageKey = new StorageKey(registry, [metadata.query.loans.debits, [currency, account]]);
        const collateralStorageKey = new StorageKey(registry, [metadata.query.loans.collaterals, [account, currency]]);
        const debit = await (context.scanner as Scanner).getStorageValue<Balance>(debitStorageKey, { blockNumber: block.number });
        const collateral = await (context.scanner as Scanner).getStorageValue<Balance>(collateralStorageKey, { blockNumber: block.number });

        return {
            debit: debit.toString(),
            collateral: collateral.toString()
        };
    };

    if (data.result) {
        const block = data.result;

        const temp = await Promise.all(block.events
            .filter((event) => event.section === 'loans' && event.method === 'PositionUpdated')
            .map(async (event) => {
                const { args } = event;
                /// Position updated (owner, collateral_type, collateral_adjustment, debit_adjustment)
                const loanInfo = await getLoanInfo(block, args[1], args[0]);
                return {
                    id: `${args[1]}-${args[0]}`,
                    currency: args[1],
                    account: args[0],
                    debit: loanInfo.debit,
                    collateral: loanInfo.debit,
                    createAtBlock: block.number,
                    createAtBlockHash: block.hash,
                    createAt: block.timestamp
                };
            })
        );

        await LoanModel.bulkCreate(temp, {
            updateOnDuplicate: ['id'],
            transaction: context.transaction
        });
    }

    await next();
}