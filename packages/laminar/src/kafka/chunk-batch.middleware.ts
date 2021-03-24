import { EachBatchMiddleware } from './types';

/**
 * Chunk a batch messages consume.
 * Each `size` it will call the consumer function, then fire the heartbeat and commit the offsets.
 *
 * You can use it like a middleware:
 *
 * ```typescript
 * const inBatches = chunkBatchMiddleware({ size: 500 });
 *
 * new KafkaConsumer(kafka, schemaRegistry, {
 *   topic: '...',
 *   eachBatch: inBatches({ size: 500 })(myBatchConsumer),
 * });
 * ```
 *
 * @category kafka
 */
export function chunkBatchMiddleware({ size = 1000 }): EachBatchMiddleware {
  return (next) => async (payload) => {
    let start = 0;
    do {
      const messages = payload.batch.messages.slice(start, start + size);
      const offsets = messages.map(({ offset }) => +offset).sort((a, b) => a - b);

      const highestOffset = offsets[offsets.length - 1].toString();
      const lowestOffset = offsets[0].toString();

      await next({
        ...payload,
        batch: { ...payload.batch, messages, firstOffset: () => lowestOffset, lastOffset: () => highestOffset },
      });
      start += size;
      await payload.heartbeat();
      payload.resolveOffset(highestOffset.toString());
      await payload.commitOffsetsIfNecessary();
    } while (payload.isRunning() && !payload.isStale() && start < payload.batch.messages.length);
  };
}
