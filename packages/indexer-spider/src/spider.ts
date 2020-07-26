import { scheduleJob } from 'node-schedule';

import { defaultLogger } from "@open-web3/util";
import { CachedStorage } from '@acala-weaver/cached-storage';

import { Middleware, Context, SpiderController, Rule, Job } from "./types";
import { Logger } from '@open-web3/util/logger';

export interface ChainSpiderOptions extends ScannerOptions {
    storage: CachedStorage;
    controller: SpiderController;
    gap?: number;
    coucount?: number;
    loggerName?: string;
}

export class ChainSpider {
    #scanner: Scanner; // scanner
    #middlewares: Middleware[]; // middleware list
    #context!: Context; // context
    #gap!: number;
    #concurrent!: number;
    #controller: SpiderController;
    #jobs: [Rule, Job][];
    #logger: Logger;

    constructor(options: ChainSpiderOptions) {
        this.#scanner = new Scanner(options);
        this.#gap = options.gap || 75; // default gap is block number in 5 minutes.
        this.#concurrent = options.coucount || 100;
        this.#controller = options.controller;
        this.#jobs = [];
        this.#logger = defaultLogger.createLogger(options.loggerName || 'chain-spider');

        // initialize context
        this.#context = {
            gap: this.#gap,
            scanner: this.#scanner
        };

        // throw wsProvider error
        this.#scanner.wsProvider.on("disconnected", (error) => {
            this.#logger.error(error);
            throw error;
        });
        this.#scanner.wsProvider.on("error", (error) => {
            this.#logger.error(error);
            throw error;
        });

        this.#middlewares = [];
        this.onResult = this.onResult.bind(this);
    }

    // use middleware
    public use(target: Middleware): void {
        this.#middlewares.push(target);
    }

    private createNext(
        data: SubscribeBlock | SubscribeBlockError,
        middleware: Middleware,
        next: () => Promise<unknown>,
        context: Context
    ): () => Promise<unknown> {
        return async () => await middleware(data, next, context);
    }

    private composeMiddleware(data: SubscribeBlock | SubscribeBlockError) {
        const context  = { ...this.#context };

        return () => {
            let index = -1;
            const dispatch  = (i: number): Promise<unknown> => {
                index = i;

                const fn = this.#middlewares[index];

                if (index === this.#middlewares.length) return Promise.resolve();

                if (!fn) return Promise.resolve();

                try {
                    return Promise.resolve(fn(data, dispatch.bind(null, i + 1), context))
                } catch (error) {
                    return Promise.reject(error);
                }
            };

            return dispatch(0);
        };
    }

    async start(): Promise<void> {
        this.#logger.info("prepare spider");
        await this.#scanner.wsProvider.connect();

        const startBlockNum = await this.#controller.getLatestBlock();
        this.#logger.info(`start at#${startBlockNum}`);

        this.#scanner
            .subscribe({ start: startBlockNum, concurrent: this.#concurrent })
            .subscribe({
                next: this.onResult,
                error: this.onError,
            });

        // exclude jobs
        this.#jobs.forEach((config) => {
            scheduleJob(config[0], () => config[1](this.#scanner, this.#logger));
        });
    }

    addJob (rule: Rule, job: Job): void {
        this.#jobs.push([rule, job]);
    }

    async onResult(detail: SubscribeBlock | SubscribeBlockError): Promise<void> {
        try {
            await this.composeMiddleware(detail)();

            if (detail.result) {
                await this.#controller.onSyncSuccess(detail.blockNumber);
                this.#logger.info(`process #${detail.blockNumber} sucess`);
            } else {
                await this.#controller.onSyncFailure(detail.blockNumber);
                this.#logger.error(`process #${detail.blockNumber} failed`);
            }
        } catch (error) {
            this.#logger.error(error);

            throw error;
        }
    }

    onError(error: Error): void {
        this.#logger.error(error);
        throw error;
    }
}
