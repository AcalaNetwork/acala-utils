import { Middleware, eventsHandler } from '@acala-weaver/chain-spider';
import { AuctionModel } from '@acala-weaver/database-models';

export const auction: Middleware = async (data, next, context) => {
    if (data.result) {
        const block = data.result;
        const temp: unknown[] = [];

        eventsHandler([
            {
                section: 'auctionManager',
                method: 'NewCollateralAuction',
                handler: (event) => {
                    const { args } = event;
                    temp.push({
                        auctionId: args[0],
                        auctionType: 'collatearl',
                        startAtBlock: block.number,
                        currencyId: args[1],
                        amount: args[2],
                        rawData: args,
                        status: 'progress',
                        createAtBlock: block.number.toString(),
                        createAtBlockHash: block.hash,
                        createAt: block.timestamp
                    });
                }
            },
            {
                section: 'auctionManager',
                method: 'NewDebitAuction',
                handler: (event) => {
                    const { args } = event;
                    temp.push({
                        auctionId: args[0],
                        auctionType: 'debit',
                        startAtBlock: block.number,
                        currencyId: 'AUSD',
                        amount: args[2],
                        rawData: args,
                        status: 'progress',
                        createAtBlock: block.number.toString(),
                        createAtBlockHash: block.hash,
                        createAt: block.timestamp
                    });
                }
            },
            {
                section: 'auctionManager',
                method: 'NewSurplusAuction',
                handler: (event) => {
                    const { args } = event;
                    temp.push({
                        auctionId: args[0],
                        auctionType: 'surplus',
                        startAtBlock: block.number,
                        currencyId: 'ACA',
                        amount: args[1],
                        rawData: args,
                        status: 'progress',
                        createAtBlock: block.number.toString(),
                        createAtBlockHash: block.hash,
                        createAt: block.timestamp
                    });
                }
            },
            {
                section: 'auctionManager',
                method: 'CancelAuction',
                handler: (event) => {
                    const { args } = event;
                    temp.push({
                        auctionId: args[0],
                        status: 'cancel'
                    });
                }
            },
            {
                section: 'auctionManager',
                method: 'CollateralAuctionDealed',
                handler: (event) => {
                    const { args } = event;
                    temp.push({
                        auctionId: args[0],
                        endAtBlock: block.number,
                        endBalance: args[2],
                        winner: args[3],
                        endAmount: args[4],
                        status: 'end'
                    });
                }
            },
            {
                section: 'auctionManager',
                method: 'DebitAuctionDealed',
                handler: (event) => {
                    const { args } = event;
                    temp.push({
                        auctionId: args[0],
                        endAtBlock: block.number,
                        endBalance: args[1],
                        winner: args[2],
                        endAmount: args[3],
                        status: 'end'
                    });
                }
            },
            {
                section: 'auctionManager',
                method: 'SurplusAuctionDealed',
                handler: (event) => {
                    const { args } = event;
                    temp.push({
                        auctionId: args[0],
                        endAtBlock: block.number,
                        endBalance: args[1],
                        winner: args[2],
                        endAmount: args[3],
                        status: 'end'
                    });
                }
            },
        ])(block.events);

        await AuctionModel.bulkCreate(temp, {
            updateOnDuplicate: ['auctionId'],
            transaction: context.transaction
        });
    }

    await next();
}