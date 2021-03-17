import type * as PgBoss from 'pg-boss';
import { Service } from '../types';
import { Queue, Publish, Subscribe } from './types';

export class QueueService implements Queue, Service {
  constructor(
    public boss: PgBoss,
    public publishOptions?: {
      [queue: string]: PgBoss.ExpirationOptions & PgBoss.RetentionOptions & PgBoss.RetryOptions;
    },
  ) {}

  async publish(req: Publish): Promise<string | null> {
    return await this.boss.publish({ options: { ...this.publishOptions?.[req.name], ...req.options }, ...req });
  }

  async subscribe<ReqData>(req: Subscribe<ReqData>): Promise<void> {
    return await this.boss.subscribe<ReqData, void>(req.name, req.options ?? {}, (job) =>
      req.worker({ ...job, queue: this }),
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
