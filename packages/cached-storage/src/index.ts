/* eslint-disable @typescript-eslint/no-explicit-any */

import { RedisClient, createClient } from 'redis';
import { get } from 'lodash';
import { Sequelize, Op } from 'sequelize';
import init, { Block, Extrinsic, Events, DispatchableCall } from '@open-web3/indexer/models';
import { promisify } from 'util';
import Scanner from '@open-web3/scanner';
import { StorageKey } from '@polkadot/types';
import { range, Observable, concat, from } from 'rxjs';
import { take, switchMap, mergeMap } from 'rxjs/operators';

import { BlockData, ExtrinsicData, EventData, WithNull, BlockResult } from './types';

export * from './types';

export interface CachedStorageConfig {
  url: string;
  indexer: Sequelize;
  scanner: Scanner;
}

type KEYTYPE = 'BLOCK' | 'EXTRINSIC' | 'EVENT' | string; 

export class CachedStorage {
  private indexer: Sequelize;
  private db: RedisClient;
  public scanner: Scanner;
  public get: (key: string) => Promise<string | null | undefined>;
  public set: (key: string, value: string) => Promise<'Ok' | null | undefined | unknown>;

  constructor(config: CachedStorageConfig) {
    this.db = createClient({
      url: config.url
    });

    this.get = promisify(this.db.get).bind(this.db);
    this.set = promisify(this.db.set).bind(this.db);

    this.indexer = config.indexer;
    this.scanner = config.scanner;
  }

  async prepare (): Promise<void> {
    await this.indexer.sync();
    await this.scanner.wsProvider.connect();

    init(this.indexer);
  }

  async getValue (type: KEYTYPE, block: string | number): Promise<string | null | undefined> {
    return this.get(`${type}_${block}`);
  }

  async setValue (type: KEYTYPE, block: string | number, value: string): Promise<'Ok' | null | undefined | unknown> {
    return this.set(`${type}_${block}`, value);
  }

  async getBlock (blockNumber: number, useCache = true ): Promise<WithNull<BlockData>> {
    let output: WithNull<BlockData> = null;

    if (useCache) {
      const result = await this.getValue('BLOCK', blockNumber);

      if (result) {
        try {
          output = JSON.parse(result);
        } catch (e) {
          //swallow error
        }
      }
    } 

    if (!output) {
      const originResult = await Block.findOne({
        where: { blockNumber }
      });

      if (originResult) {
        output = {
          blockHash: (originResult as any).blockHash,
          blockNumber: (originResult as any).blockNumber,
          parentHash: (originResult as any).parentHash,
          timestamp: (originResult as any).timestamp,
          author: (originResult as any).author
        };
        await this.setValue('BLOCK', blockNumber, JSON.stringify(output));
      }
    }

    return output;
  }

  async getExtrinsics (blockNumber: number, useCache = true): Promise<ExtrinsicData[]> {
    let output: ExtrinsicData[] = [];

    if (useCache) {
      const result = await this.getValue('EXTRINSIC', blockNumber);

      if (result) {
        try {
          output = JSON.parse(result);
        } catch (e) {
          // swallow error
        }
      }
    }

    if (!output.length) {
      const originBlock = await this.getBlock(blockNumber);
      const originExtrins = await Extrinsic.findAll({
        where: { blockNumber }
      }) as any[];
      const originDispatchCall = originBlock ? await DispatchableCall.findAll({
        where: {
          extrinsic: {
            [Op.startsWith]: originBlock.blockHash
          }
        }
      }) as any[] : [];

      if (originExtrins.length) {
        originExtrins.forEach((item) => {
          output.push({
            hash: item.hash,
            blockHash: item.blockHash,
            blockNumber: item.blockHash,
            index: item.index,
            section: item.section,
            signer: item.signer,
            method: item.method,
            args: item.args,
            result: item.result
          });
        });
      }

      if (originDispatchCall.length) {
        originDispatchCall.forEach((item) => {

          const [block, extrinsicIndex, childrenIndex] = item.id.split('-');

          if (!childrenIndex) {
            return;
          }

          const parentExtrinsic = output.find((extrinsic) => {
            return extrinsic.index == extrinsicIndex;
          });

          output.push({
            hash: item.hash,
            blockHash: originBlock ? originBlock.blockHash : '',
            blockNumber: originBlock ? originBlock.blockNumber : -1,
            index: parentExtrinsic? parentExtrinsic.index : 0,
            method: item.method,
            section: item.section,
            signer: parentExtrinsic ? parentExtrinsic.signer : '',
            args: item.args,
            result: parentExtrinsic ? parentExtrinsic.result : '',

            isDispatched: true,
            parentHash: parentExtrinsic?.hash,
            dispatchIndex: item.extrinsic.split('-')[2] || null
          })
        })
      }

      this.setValue('EXTRINSIC', blockNumber, JSON.stringify(output));
    }

    return output;
  }

  async getEvents (blockNumber: number, useCache = true): Promise<EventData[]> {
    let output: EventData[] = [];

    if (useCache) {
      const result = await this.getValue('EVENT', blockNumber);

      if (result) {
        try {
          output = JSON.parse(result);
        } catch (e) {
          //swallow error
        }
      } 
    }

    if (!output.length) {
      const originResult = await Events.findAll({
        where: { blockNumber }
      }) as any[];

      if (originResult.length) {
        originResult.map((item) => {
          output.push({
            blockHash: item.blockHash,
            blockNumber: item.blockNumber,
            index: item.index,
            section: item.section,
            method: item.method,
            args: item.args
          })
        });

        await this.setValue('EVENT', blockNumber, JSON.stringify(output));
      }
    }

    return output;
  }

  async getStorage (blockNumber: number, key: string, params: string[], useCache = true): Promise<any> {
    if (useCache) {
      const value = await this.getValue(`${key}_${params?.toString()}`, blockNumber);

      if (value) {
        return value;
      }
    }

    try {
      const block = await this.scanner.getBlockDetail({ blockNumber: blockNumber });

      if (!block) return null;

      const { metadata, registry } = block.chainInfo;
      const storageKey = new StorageKey(registry, params ? [get(metadata, key), params] : get(metadata, key));
      const blockAt = { blockNumber: block.number, blockHash: block.hash };

      const value = await this.scanner.getStorageValue(storageKey, blockAt);

      if (value) {
        await this.setValue(`${key}_${params?.toString()}`, blockNumber, JSON.stringify((value as any).toHuman()));
      }

      return JSON.stringify((value as any).toHuman()); 
    } catch(e) {
      console.log(e);
      return null;
    }
  }

  start (startBlock = 0, endBlock?: number): Observable<BlockResult> {
    let block$: Observable<number>;

    if (startBlock !== undefined && endBlock !== undefined) {
      block$ = range(startBlock, endBlock - startBlock + 1);
    } else {
      block$ = from(this.scanner.subscribeNewBlockNumber()).pipe(
        take(1),
        switchMap((latestBlock) => {
          return concat(range(startBlock, latestBlock - 1), this.scanner.subscribeNewBlockNumber());
        })
      );
    }

    const getData = async (blockNumber: number): Promise<BlockResult> => {
      const block = await this.getBlock(blockNumber, false);
      const extrinsics = await this.getExtrinsics(blockNumber, false);
      const events = await this.getEvents(blockNumber, false);
      
      return {
        blockNumber,
        block,
        extrinsics,
        events
      };
    };

    return block$.pipe(
      mergeMap((blockNumber: number) => {
        return from(getData(blockNumber));
      }, 100)
    );
  }
}