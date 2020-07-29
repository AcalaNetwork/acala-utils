import * as Queue from "bull";

interface TaskManagerConfig {
  url: string;
  handler: (data: any) => Promise<any>;
}

export class TaskManager {
  public callQueue!: Queue.Queue;
  public handler!: TaskManagerConfig["handler"];

  constructor(config: TaskManagerConfig) {
    this.callQueue = new Queue("call", config.url);
    this.handler = config.handler;
  }

  processCallQueue() {
    this.callQueue.process(async (job, done) => {
      try {
        const result = await this.handler(job.data);

        done(result);
      } catch (e) {
        console.log("error", e);
        done(new Error(e));
      }
    });
  }
}
