import { Service } from '@laminar/laminar';
import { Queue, Worker } from './types';

/**
 * Start a queue worker {@link Service}, by subscribing to the queue on start.
 */
export class QueueWorkerService<TData extends object> implements Service {
  constructor(
    public queue: Queue,
    public subscribe: Worker<TData>,
  ) {}

  async start(): Promise<this> {
    await this.queue.work(this.subscribe);
    return this;
  }

  async stop(): Promise<this> {
    await this.queue.offWork(this.subscribe.name);
    return this;
  }

  describe(): string {
    return [
      `🧑‍🏭 Queue Worker: ${this.subscribe.name}`,
      this.subscribe.options ? `Options ${JSON.stringify(this.subscribe.options)}` : undefined,
    ].join(', ');
  }
}
