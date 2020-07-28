import * as Queue  from 'bull';

interface TaskManagerConfig {
    url: string;
    handler: (data: any) => Promise<any>;
}

export class TaskManager {
    public callQueue!: Queue.Queue;
    public handler!: TaskManagerConfig['handler'];

    constructor(config: TaskManagerConfig) {
        this.callQueue = new Queue('call', config.url);
        this.handler = config.handler;

        this.processCallQueue();
    }

    processCallQueue () {
        this.callQueue.process((job) => {
            return this.handler(job.data);
        });
    }
};