import { get } from 'lodash';
import { AccountModel } from "@acala-weaver/database-models";
import { eventsHandler } from "@acala-weaver/chain-spider";
import { Middleware } from "../types";

export const account: Middleware = async (data) => {
  const block = data.block;
  const temp: unknown[] = [];

  eventsHandler([
    {
      section: "system",
      method: "NewAccount",
      handler: (event) => {
        temp.push({
          account: get(event, 'args.0', ''),
          createAtBlock: block?.blockNumber,
          createAtBlockHash: block?.blockHash,
          createAt: block?.timestamp,
        });
      },
    },
  ])(data.events);

  await AccountModel.bulkCreate(temp, { updateOnDuplicate: ["account"] });
};
