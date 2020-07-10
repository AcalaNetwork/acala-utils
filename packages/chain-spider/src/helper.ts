import { Event, Extrinsic } from '@open-web3/scanner/types';

interface HandlerConfig<T> {
    section: string;
    method: string;
    handler: (item: T) => void;
}

type HandlerConfigHashMap<T> = {
    [k in string]: HandlerConfig<T>['handler'];
}

type Handler<T = Event> = (config: HandlerConfig<T>[]) => (list: T[]) => void;

function handler<T extends { section: string, method: string } > (config: HandlerConfig<T>[]): (list: T[]) => void {
    const dispatcherHashMap: HandlerConfigHashMap<T> = config.reduce((hashMap, item) => {
        hashMap[`${item.section}_${item.method}`] = item.handler
        return hashMap;
    }, {} as HandlerConfigHashMap<T>);

    return (list: T[]) => {
        list.forEach((item) => {
            const key = `${item.section}_${item.method}`;
            const handler = dispatcherHashMap[key];

            if (handler) {
                handler(item);
            }
        });
    }
}

export const eventsHandler = handler as Handler<Event>;

export const extrinsicHandler = handler as Handler<Extrinsic>;

