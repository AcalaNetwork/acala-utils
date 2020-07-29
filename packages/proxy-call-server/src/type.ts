import { KeyringPair } from "@polkadot/keyring/types";

export interface CallParams {
  path: string;
  params: string[];
  account: "FAUCET" | "SUDO";
  isSudo?: boolean;
  isBatch?: boolean;
  batchParams?: {
    path: string;
    params: string[];
  }[];
}

export interface Account {
  name: string;
  pair: KeyringPair;
}

export type JobId = string | number;
