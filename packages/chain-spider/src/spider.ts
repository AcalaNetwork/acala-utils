import Scanner from "@open-web3/scanner";
import {
    SubscribeBlock,
    SubscribeBlockError,
    ScannerOptions,
} from "@open-web3/scanner/types";
import { defaultLogger } from "@open-web3/util";
import { scheduleJob } from 'node-schedule';

import { Middleware, Context, SpiderController, Rule, Job } from "./types";

type JobParameters = Parameters<typeof scheduleJob>;

const logger = defaultLogger.createLogger("chain-spider");

export interface ChainSpiderOptions extends ScannerOptions {
    controller: SpiderController;
    gap?: number;
    coucount?: number;
}

export class ChainSpider {
    #scanner: Scanner; // scanner
    #middlewares: Middleware[]; // middleware list
    #context!: Context; // context
    #gap!: number;
    #concurrent!: number;
    #controller: SpiderController;
    #jobs: [Rule, Job][];

    constructor(options: ChainSpiderOptions) {
        this.#scanner = new Scanner(options);
        this.#gap = options.gap || 75; // default gap is block number in 5 minutes.
        this.#concurrent = options.coucount || 100;
        this.#controller = options.controller;
        this.#jobs = [];

        // initialize context
        this.#context = {
            gap: this.#gap,
            scanner: this.#scanner
        };

        // throw wsProvider error
        this.#scanner.wsProvider.on("disconnected", (error) => {
            logger.error(error);
            throw error;
        });
        this.#scanner.wsProvider.on("error", (error) => {
            logger.error(error);
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
        return this.#middlewares.reduceRight(
            (pre: () => Promise<unknown>, cur: Middleware) => this.createNext(data, cur, pre, this.#context),
            () => Promise.resolve()
        );
    }

    async start(): Promise<void> {
        logger.info("prepare spider");
        await this.#scanner.wsProvider.connect();

        const startBlockNum = await this.#controller.getLatestBlock();
        logger.info(`start at#${startBlockNum}`);

        this.#scanner
            .subscribe({ start: startBlockNum, concurrent: this.#concurrent })
            .subscribe({
                next: this.onResult,
                error: this.onError,
            });

        // exclude jobs
        this.#jobs.forEach((config) => {
            scheduleJob(config[0], () => {
                config[1](this.#scanner, logger);
            });
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
                logger.info(`process #${detail.blockNumber} sucess`);
            } else {
                await this.#controller.onSyncFailure(detail.blockNumber);
                logger.error(`process #${detail.blockNumber} failed`);
            }
        } catch (error) {
            logger.error(error);

            throw error;
        }
    }

    onError(error: Error): void {
        logger.error(error);
        throw error;
    }
}
