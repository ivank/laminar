import type * as PgBoss from 'pg-boss';
import { Service } from '../types';
import { Queue, Publish, Subscribe } from './types';

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
    public publishOptions?: {
      [queueName: string]: PgBoss.ExpirationOptions & PgBoss.RetentionOptions & PgBoss.RetryOptions;
    },
  ) {}

  async publish(ctx: Publish): Promise<string | null> {
    return await this.boss.publish({ options: { ...this.publishOptions?.[ctx.name], ...ctx.options }, ...ctx });
  }

  async subscribe<ReqData>(ctx: Subscribe<ReqData>): Promise<void> {
    return await this.boss.subscribe<ReqData, void>(ctx.name, ctx.options ?? {}, (job) =>
      ctx.worker({ ...job, queue: this }),
    );
  }

  async unsubscribe(name: string): Promise<boolean> {
    return await this.boss.unsubscribe(name);
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
