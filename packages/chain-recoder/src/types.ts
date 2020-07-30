import { BlockResult } from "@acala-weaver/cached-storage";

export type Middleware = (data: BlockResult) => Promise<void>;

export const currenciesId = ["ACA", "DOT", "XBTC", "LDOT", "RENBTC"];

export const collateralCurrencyIds = ["DOT", "XBTC", "LDOT", "RENBTC"];
