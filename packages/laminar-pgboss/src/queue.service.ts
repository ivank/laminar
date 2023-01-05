import type PgBoss from 'pg-boss';
import { Service } from '@ovotech/laminar';
import { Queue, Send, Worker } from './types';

/**
 * A laminar {@link Service} that implements {@link Queue} as well
 *
 * Allows you to use the full feature set of [PgBoss](https://github.com/timgit/pg-boss) to publish and subscribe to queues.
 * You can also specify options to be passed down to publish calls.
 */
export class QueueService implements Queue, Service {
  constructor(
    public boss: PgBoss,
    /**
     * Custom publish options for individual queues, to be passed on when publishing.
     */
    public sendOptions?: {
      [queueName: string]: PgBoss.ExpirationOptions &
        PgBoss.RetentionOptions &
        PgBoss.RetryOptions &
        PgBoss.CompletionOptions;
    },
  ) {}

  async send<TData extends object>(ctx: Send<TData>): Promise<string | null> {
    return await this.boss.send({ options: { ...this.sendOptions?.[ctx.name], ...ctx.options }, ...ctx });
  }

  async insert<TData extends object>(items: Send<TData>[], options?: PgBoss.InsertOptions): Promise<void> {
    const jobs = items.map((item) => ({ options: { ...this.sendOptions?.[item.name], ...item.options }, ...item }));
    await (options ? this.boss.insert(jobs, options) : this.boss.insert(jobs));
  }

  async work<TData extends object>(ctx: Worker<TData>): Promise<string> {
    return await this.boss.work<TData, void>(ctx.name, ctx.options ?? {}, (job) => ctx.worker({ ...job, queue: this }));
  }

  async offWork(name: string): Promise<void> {
    return await this.boss.offWork(name);
  }

  async start(): Promise<this> {
    await this.boss.start();
    return this;
  }

  async stop(): Promise<this> {
    await this.boss.stop();
    return this;
  }

  describe(): string {
    return '🧑‍⚖️ Queue';
  }
}
