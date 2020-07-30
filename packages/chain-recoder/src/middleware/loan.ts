import { get } from "lodash";
import { LoanModel } from "@acala-weaver/database-models";
import { eventsHandler } from "@acala-weaver/chain-spider";
import { Middleware } from "../types";

export const loan: Middleware = async (data) => {
  const block = data.block;
  const temp: unknown[] = [];

  eventsHandler([
    {
      section: "loans",
      method: "PositionUpdated",
      handler: (event) => {
        const { args } = event;

        temp.push({
          id: `${get(args, "1")}-${get(args, "0")}`,
          currency: get(args, "1"),
          account: get(args, "0"),
          updateAtBlock: block?.blockNumber,
          updateAtBlockHash: block?.blockHash,
          updateAt: block?.timestamp,
        });
      },
    },
  ])(data.events);

  await LoanModel.bulkCreate(temp, { updateOnDuplicate: [] });
}