import { Sequelize } from "sequelize/types";
import { Logger } from "@open-web3/util/logger";

export interface ServerContext {
    db: Sequelize;
    logger: Logger;
}

export interface StringIndexedObj {
    [k: string]: unknown;
}