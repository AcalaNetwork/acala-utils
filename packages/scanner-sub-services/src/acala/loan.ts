import { Sequelize } from 'sequelize';

import { StorageKey } from '@polkadot/types';
import Scanner from '@open-web3/scanner';
import { Event, Block } from "@open-web3/scanner/types";
import { Balance } from '@acala-network/types/interfaces/runtime';

import { BaseService, HandlerConfig } from '@acala-weaver/types';
import { LoanModel, initLoanModel } from '@acala-weaver/database-models';


export class LoanService extends BaseService {
    private model = LoanModel;

    constructor(name: string, db: Sequelize, scanner: Scanner) {
        super(name, db, scanner);
    }

    initDB (): void {
        initLoanModel(this.db);
    }

    async getLoanInfo(block: Block, currency: string, account: string): Promise<{ debit: string, collateral: string}> {
        const { metadata, registry } = block.chainInfo;
        const debitStorageKey = new StorageKey(registry, [metadata.query.loans.debits, [currency, account]]);
        const collateralStorageKey = new StorageKey(registry, [metadata.query.loans.collaterals, [account, currency]]);
        const debit = await this.scanner.getStorageValue<Balance>(debitStorageKey, { blockNumber: block.number });
        const collateral = await this.scanner.getStorageValue<Balance>(collateralStorageKey, { blockNumber: block.number });

        return {
            debit: debit.toString(),
            collateral: collateral.toString()
        };
    }

    async onEvent(event: Event, block: Block, config: HandlerConfig): Promise<void> {
        const { section, method, args } = event;

        if (section === 'loans' && method === 'PositionUpdated') {
            /// Position updated (owner, collateral_type, collateral_adjustment, debit_adjustment)
            const loanInfo = await this.getLoanInfo(block, args[1], args[0]);

            await this.model.upsert({
                currency: args[1],
                account: args[0],
                debit: loanInfo.debit,
                collateral: loanInfo.debit,
                createAtBlock: block.number,
                createAtBlockHash: block.hash,
                createAt: block.timestamp
            }, { transaction: config.transition });
        }
    }
}
