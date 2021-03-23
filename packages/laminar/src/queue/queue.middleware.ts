import { Middleware } from '../types';
import { Queue } from './types';

export interface QueueContext {
  queue: Queue;
}

/**
 * A generic middleware to add {@link Queue} instance to any resolver.
 */
export const queueMiddleware = (queue: Queue): Middleware<QueueContext> => (next) => (ctx) => next({ ...ctx, queue });
