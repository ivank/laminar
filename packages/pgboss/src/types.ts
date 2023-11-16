import { AbstractMiddleware, Empty } from '@laminar/laminar';
import type { WorkOptions, SendOptions, InsertOptions } from 'pg-boss';

/**
 * Send a job to a queue.
 * You can read in [PgBoss for docs about publish options](https://github.com/timgit/pg-boss/blob/master/docs/configuration.md#send-options)
 */
export interface Send<TData extends Empty = Empty> {
  name: string;
  data?: TData;
  options?: SendOptions;
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
 * Job queue worker
 */
export interface Worker<TData extends Empty = Empty, TContext extends Empty = Empty> {
  name: string;
  worker: JobWorker<TData, TContext>;
  options?: WorkOptions;
}

/**
 * An abstract interfacee for a queue, backed by [PgBoss](https://github.com/timgit/pg-boss)
 */
export interface Queue {
  send<TData extends object>(request: Send<TData>): Promise<string | null>;
  insert<TData extends object>(items: Send<TData>[], options?: InsertOptions): Promise<void>;
  work<TData extends object>(request: Worker<TData>): Promise<string>;
  offWork(name: string): Promise<void>;
}
