import { Middleware } from '../types';
import { Queue } from './types';

/**
 * The context added by {@link queueMiddleware}
 * @category queue
 */
export interface QueueContext {
  queue: Queue;
}

/**
 * A generic middleware to add {@link Queue} instance to any resolver.
 *
 * @category queue
 */
export function queueMiddleware(queue: Queue): Middleware<QueueContext> {
  return (next) => (ctx) => next({ ...ctx, queue });
}
