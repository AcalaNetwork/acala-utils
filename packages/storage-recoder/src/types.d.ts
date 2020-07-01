import { INanoDate } from 'influx';
import { Fixed18 } from '@acala-network/app-util';

declare module '@acala-weaver/chain-spider' {
    export type Context = {
        prices: Map<string, Fixed18>,
        timestamp: INanoDate
    }
}