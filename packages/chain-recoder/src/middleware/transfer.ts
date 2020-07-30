import { get } from "lodash";
import { TransferModel } from "@acala-weaver/database-models";
import { handler, Handler } from "@acala-weaver/chain-spider";
import { Middleware } from "../types";
import { ExtrinsicData } from "@acala-weaver/cached-storage";

const extrinsicHandler = handler as Handler<ExtrinsicData>;

export const transfer: Middleware = async (data) => {
  const block = data.block;
  const temp: unknown[] = [];

  extrinsicHandler([
    {
      section: "currencies",
      method: "transfer",
      handler: (extrinsic) => {
        const { args } = extrinsic;
        if (extrinsic.isDispatched) {
          temp.push({
            hash: `${extrinsic.hash}-${extrinsic.dispatchIndex}`,
            from: extrinsic.signer,
            to: get(args, ["dest"]),
            asset: get(args, ["currency_id"]),
            amount: get(args, ["amount"]),
            result: extrinsic.result,

            createAtBlock: block?.blockNumber,
            createAtBlockHash: block?.blockHash,
            createAt: block?.timestamp,
          });
        } else {
          temp.push({
            hash: `${extrinsic.hash}`,
            from: extrinsic.signer,
            to: get(args, ["dest"]),
            asset: get(args, ["currency_id"]),
            amount: get(args, ["amount"]),
            result: extrinsic.result,

            createAtBlock: block?.blockNumber,
            createAtBlockHash: block?.blockHash,
          });
        }
      },
    },
  ])(data.extrinsics);

  await TransferModel.bulkCreate(temp, { updateOnDuplicate: ["hash"] });
};
