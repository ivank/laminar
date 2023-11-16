import { Middleware } from '@laminarjs/laminar';
import { Queue } from './types';

/**
 * The context added by {@link queueMiddleware}
 */
export interface QueueContext {
  queue: Queue;
}

/**
 * A generic middleware to add {@link Queue} instance to any resolver.
 */
export function queueMiddleware(queue: Queue): Middleware<QueueContext> {
  return (next) => (ctx) => next({ ...ctx, queue });
}
