import * as express from "express";
import * as winston from "winston";
import * as bodyParser from "body-parser";
import * as expressWinston from "express-winston";
import { ApiPromise } from "@polkadot/api";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { DispatchError } from "@polkadot/types/interfaces";
import { ITuple } from "@polkadot/types/types";
import { get, noop, isArray } from "lodash";
import { Keyring } from "@polkadot/keyring";
import { KeyringOptions, KeyringPair } from "@polkadot/keyring/types";

import { TaskManager } from "./task";
import { CallParams, JobId } from "./type";

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
});

interface Result {
  code: number;
  msg?: string;
  error?: string;
  data?: any;
}

interface AccountConfig {
  name: string;
  mnemonic?: string;
  uri?: string;
  options?: KeyringOptions;
}

interface ProxyCallServerConfig {
  api: ApiPromise;
  port: number | string;
  accounts: AccountConfig[];
  allowAccessTokens: string[];
  taskDB: string;
}

export class ProxyCallServer {
  private api!: ApiPromise;
  private accounts!: {
    name: string;
    pair: KeyringPair;
  }[];
  private accountsConfig!: AccountConfig[];
  private allowAccessTokens: string[];
  private port!: number | string;
  private taskManager!: TaskManager;

  constructor(config: ProxyCallServerConfig) {
    this.api = config.api;
    this.allowAccessTokens = config.allowAccessTokens;
    this.accountsConfig = config.accounts;
    this.port = config.port;

    this.execCall = this.execCall.bind(this);
    this.validAccessToken = this.validAccessToken.bind(this);

    this.taskManager = new TaskManager({
      url: config.taskDB,
      handler: this.execCall,
    });
  }

  importAccounts(
    accounts: AccountConfig[]
  ): { name: string; pair: KeyringPair }[] {
    return accounts
      .map((item) => {
        const keyring = new Keyring(item.options || { type: "sr25519" });
        const result = { name: item.name, pair: null as any };

        if (item.mnemonic) {
          result['pair'] = keyring.addFromMnemonic(item.mnemonic);
        }
        if (item.uri) {
          result['pair'] = keyring.addFromUri(item.uri);
        }

        return result;
      })
      .filter((item) => !!item.pair);
  }

  async start() {
    await this.api.isReady;

    this.accounts = this.importAccounts(this.accountsConfig);
    this.taskManager.processCallQueue();

    this.api.on('disconnected', () => {
      this.taskManager.callQueue.pause();
    });
    this.api.on('connected', () => {
      this.taskManager.callQueue.resume();
    });

    this.startServer();
  }

  startServer() {
    const app = express();

    app.use(bodyParser.json());
    app.use(this.validAccessToken);
    app.use(
      expressWinston.logger({
        transports: [new winston.transports.Console()],
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.json()
        ),
        meta: true,
        msg: "HTTP {{req.method}} {{req.url}}",
        expressFormat: true,
      })
    );

    app.get("/ping", (req, res) => {
      res.send("pong");
    });

    // query accounts name and address in service
    app.get("/accounts", (req, res) => {
      res.send(
        this.accounts.map((itme) => ({
          name: itme.name,
          address: itme.pair.address,
        }))
      );
    });

    // push a call to job queue
    app.post("/call/add", async (req, res) => {
      if (!req.body.data) {
        res.send({ code: 402, error: "params error, need data" });
        return;
      }

      const result = await this.addCall(req.body.data);

      res.send(result);
    });

    // cancel job
    app.post("/call/cancel", async (req, res) => {
      if (!req.body.id) {
        res.send({ code: 402, error: "params error, need job id" });
        return;
      }

      const result = await this.cancelJob(req.body.id);

      res.send(result);
    });

    // query job information
    app.get("/call/:id", async (req, res) => {
      const result = await this.queryJob(req.params.id);
      res.send(result);
    });

    // query job information, status 'completed' | 'waiting' | 'active' | 'delayed' | 'failed' | 'paused'
    app.get("/calls/:status", async (req, res) => {
      const result = await this.queryJobsList(req.params.status as any);

      res.send({ code: 200, data: result });
    });

    app.listen(this.port, () => {
      logger.log("info", `server start at ${this.port}`);
    });
  }

  async validAccessToken(
    req: express.Request,
    res: express.Response,
    next: () => any
  ) {
    // validat access token in post request
    if (req.method === "POST") {
      const index = this.allowAccessTokens.findIndex(
        (item) => item === req.body.accessToken
      );

      if (index === -1) {
        res.send({ code: 400, error: "no authority" });
        return;
      }
    }

    next();
  }

  checkCallParams(data: CallParams | CallParams[]): string | undefined {
    const inner = (data: CallParams) => {
      let tx: SubmittableExtrinsic<"promise">;

      try {
        if (data.isBatch) {
          if (!data.batchParams || data.batchParams.length < 1) {
            return "batch params should not be empty";
          }

          tx = this.api.tx.utility.batch(
            data.batchParams.map((item) =>
              get(this.api, "tx." + item.path).apply(undefined, item.params)
            )
          );
        } else {
          tx = get(this.api, "tx." + data.path).apply(undefined, data.params);
        }
      } catch (e) {
        return `can't create call, ${e.toString()}`;
      }

      // check account is exist
      const accountIndex = this.accounts.findIndex(
        (item) => item.name === data.account
      );

      if (accountIndex === -1) {
        return `account:${data.account} doesn't exist`;
      }
    };

    if (isArray(data)) {
      for (let item of data) {
        const error = inner(item);

        if (error) {
          return error;
        }
      }
    } else {
      const error = inner(data);

      if (error) {
        return error;
      }
    }
  }

  async addCall(data: CallParams | CallParams[]): Promise<Result> {
    const checkCallParamsError = this.checkCallParams(data);

    if (checkCallParamsError) {
      return { code: 400, error: checkCallParamsError };
    }

    try {
      if (isArray(data)) {
        const job = await Promise.all(data.map(this.pushJob));

        return { code: 200, data: job };
      } else {
        const job = await this.pushJob(data);

        return { code: 200, data: { id: job.id, data: job.data } };
      }
    } catch (e) {
      return { code: 400, error: e.toString() };
    }
  }

  async pushJob(data: CallParams) {
    // if call is batch call, don't retry it
    if (data.isBatch) {
      return this.taskManager.callQueue.add(data, { attempts: 0 });
    } else {
      return this.taskManager.callQueue.add(data);
    }
  }

  async queryJobsList(
    type: "completed" | "waiting" | "active" | "delayed" | "failed" | "paused"
  ) {
    return this.taskManager.callQueue.getJobs([type]);
  }

  async queryJob(id: JobId): Promise<Result> {
    const job = await this.taskManager.callQueue.getJob(id);

    if (!job) {
      return { code: 400, error: "no job found" };
    }

    return { code: 200, data: job };
  }

  async cancelJob(id: JobId): Promise<Result> {
    const job = await this.taskManager.callQueue.getJob(id);

    if (!job) {
      return { code: 400, error: "no job found" };
    }

    const state = await job.getState();

    if (state === "completed") {
      return { code: 400, error: "job had completed" };
    }

    try {
      await job.remove();
      return { code: 200 };
    } catch (e) {
      return { code: 400, error: "remove job failed" };
    }
  }

  async execCall(data: CallParams): Promise<any> {
    logger.info("exec call start", data);

    let onReject: (resone?: any) => void = noop;
    let onResolve: (hash: any) => void = noop;
    const promise = new Promise((resolve, reject) => {
      onResolve = resolve;
      onReject = reject;
    });

    const checkCallParamsError = this.checkCallParams(data);

    if (checkCallParamsError) {
      onReject(checkCallParamsError);
    }

    let unSignedTx: SubmittableExtrinsic<"promise">;

    if (data.isBatch && data.batchParams) {
      unSignedTx = this.api.tx.utility.batch(
        data.batchParams.map((item) =>
          get(this.api, "tx." + item.path).apply(undefined, item.params)
        )
      );
    } else {
      unSignedTx = get(this.api, "tx." + data.path).apply(
        undefined,
        data.params
      );
    }

    // wrap sudo call
    if (data.isSudo) {
      unSignedTx = this.api.tx.sudo.sudo(unSignedTx);
    }

    const account = this.accounts.find((item) => item.name === data.account);

    if (!account) {
      onReject(`account:${data.account} doesn't exist`);

      return promise;
    }

    try {
      const tx = await unSignedTx.signAsync(account.pair);

      const unsub = await tx.send((result) => {
        if (result.isCompleted) {
          let flag = true;
          let errorMessage: DispatchError["type"] = "";

          for (const event of result.events) {
            const { data, method, section } = event.event;

            if (section === "utility" && method === "BatchInterrupted") {
              flag = false;
              errorMessage = "batch error";
              break;
            }

            // if extrinsic failed
            if (section === "system" && method === "ExtrinsicFailed") {
              const [dispatchError] = (data as unknown) as ITuple<
                [DispatchError]
              >;

              // get error message
              if (dispatchError.isModule) {
                try {
                  const mod = dispatchError.asModule;
                  const error = this.api.registry.findMetaError(
                    new Uint8Array([Number(mod.index), Number(mod.error)])
                  );

                  errorMessage = `${error.section}.${error.name}`;
                } catch (error) {
                  // swallow error
                  errorMessage = "Unknown error";
                }
              }
              flag = false;
              break;
            }
          }

          if (flag) {
            logger.info("call", { ...data, result: "success" });
            onResolve(tx.hash.toString());
          } else {
            logger.error("call", { ...data, result: errorMessage });
            onReject(errorMessage);
          }

          unsub();
        }
      });
    } catch (e) {
      onReject(e);
    }

    return promise;
  }
}
