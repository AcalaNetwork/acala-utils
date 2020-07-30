import { get } from "lodash";
import { eventsHandler } from "@acala-weaver/chain-spider";
import { AuctionModel } from "@acala-weaver/database-models";
import { Middleware } from "../types";

export const auction: Middleware = async (data) => {
  const block = data.block;
  const temp: unknown[] = [];

  eventsHandler([
    {
      section: "auctionManager",
      method: "NewCollateralAuction",
      handler: (event) => {
        const { args } = event;
        temp.push({
          auctionId: get(args, '0'),
          auctionType: "collatearl",
          startAtBlock: block?.blockNumber,
          currencyId: get(args, '1'),
          amount: get(args, '2'),
          rawData: args,
          status: "progress",
          createAtBlock: block?.blockNumber.toString(),
          createAtBlockHash: block?.blockHash,
          createAt: block?.timestamp,
        });
      },
    },
    {
      section: "auctionManager",
      method: "NewDebitAuction",
      handler: (event) => {
        const { args } = event;
        temp.push({
          auctionId: get(args, '0'),
          auctionType: "debit",
          startAtBlock: block?.blockNumber,
          currencyId: "AUSD",
          amount: get(args, '2'),
          rawData: args,
          status: "progress",
          createAtBlock: block?.blockNumber.toString(),
          createAtBlockHash: block?.blockHash,
          createAt: block?.timestamp,
        });
      },
    },
    {
      section: "auctionManager",
      method: "NewSurplusAuction",
      handler: (event) => {
        const { args } = event;
        temp.push({
          auctionId: get(args, '0'),
          auctionType: "surplus",
          startAtBlock: block?.blockNumber,
          currencyId: "ACA",
          amount: get(args, '1'),
          rawData: args,
          status: "progress",
          createAtBlock: block?.blockNumber.toString(),
          createAtBlockHash: block?.blockHash,
          createAt: block?.timestamp,
        });
      },
    },
    {
      section: "auctionManager",
      method: "CancelAuction",
      handler: (event) => {
        const { args } = event;
        temp.push({
          auctionId: get(args, '0'),
          status: "cancel",
        });
      },
    },
    {
      section: "auctionManager",
      method: "CollateralAuctionDealed",
      handler: (event) => {
        const { args } = event;
        temp.push({
          auctionId: get(args, '0'),
          endAtBlock: block?.blockNumber,
          endBalance: get(args, '2'),
          winner: get(args, '3'),
          endAmount: get(args, '4'),
          status: "end",
        });
      },
    },
    {
      section: "auctionManager",
      method: "DebitAuctionDealed",
      handler: (event) => {
        const { args } = event;
        temp.push({
          auctionId: get(args, '0'),
          endAtBlock: block?.blockNumber,
          endBalance: get(args, '1'),
          winner: get(args, '2'),
          endAmount: get(args, '3'),
          status: "end",
        });
      },
    },
    {
      section: "auctionManager",
      method: "SurplusAuctionDealed",
      handler: (event) => {
        const { args } = event;
        temp.push({
          auctionId: get(args, '0'),
          endAtBlock: block?.blockNumber,
          endBalance: get(args, '1'),
          winner: get(args, '2'),
          endAmount: get(args, '3'),
          status: "end",
        });
      },
    },
  ])(data.events);

  await AuctionModel.bulkCreate(temp, { updateOnDuplicate: ["auctionId"] });
};
