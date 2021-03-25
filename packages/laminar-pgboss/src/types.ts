import { AbstractMiddleware, Empty } from '@ovotech/laminar';
import type { PublishOptions, SubscribeOptions } from 'pg-boss';

/**
 * Publish a job to a queue.
 * You can read in [PgBoss for docs about publish options](https://github.com/timgit/pg-boss/blob/master/docs/configuration.md#publish-options)
 */
export interface Publish<TData extends Empty = Empty> {
  name: string;
  data?: TData;
  options?: PublishOptions;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface JobData<TData extends object = object> {
  data: TData;
  id: string;
  name: string;
  queue: Queue;
}

/**
 * Worker middleware, to be used when building middlewares specifically for {@link QueueWorkerService} workers.
 */
export type WorkerMiddleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = AbstractMiddleware<
  JobData,
  void,
  TProvide,
  TRequire
>;

/**
 * A function to be called by {@link QueueWorkerService} workers.
 */
export type JobWorker<TData extends Empty, TContext extends Empty = Empty> = (
  data: JobData<TData> & TContext,
) => Promise<void>;

/**
 * Subscribe to a queue using a job worker
 */
export interface Subscribe<TData extends Empty = Empty, TContext extends Empty = Empty> {
  name: string;
  worker: JobWorker<TData, TContext>;
  options?: SubscribeOptions;
}

/**
 * An abstract interfacee for a queue, backed by [PgBoss](https://github.com/timgit/pg-boss)
 */
export interface Queue {
  publish<TData>(request: Publish<TData>): Promise<string | null>;
  subscribe<TData>(request: Subscribe<TData>): Promise<void>;
  unsubscribe(name: string): Promise<boolean>;
}
