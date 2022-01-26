import { Service } from '@ovotech/laminar';
import { Queue, Worker } from './types';

/**
 * Start multiple queue workers {@link Service}, by subscribing to the queue on start.
 */
export class QueueWorkersService implements Service {
  constructor(public queue: Queue, public workers: Worker[]) {}

  async start(): Promise<this> {
    await Promise.all(this.workers.map((item) => this.queue.work(item)));
    return this;
  }

  async stop(): Promise<this> {
    await Promise.all(this.workers.map((item) => this.queue.offWork(item.name)));
    return this;
  }

  describe(): string {
    return `🧑‍🏭🧑‍🏭 Queue Workers: ${this.workers.map((item) => item.name).join(', ')}`;
  }
}
