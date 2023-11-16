import type { ConfluentSchema } from '@kafkajs/confluent-schema-registry/dist/@types';
import type { logCreator, RecordMetadata } from 'kafkajs';
import { LoggerLike } from '@laminarjs/laminar';
import { KafkaProducerService } from './kafka-producer.service';
import { EncodedMessage } from './types';

const stringLevel = { [0]: 'error', [1]: 'error', [2]: 'warn', [4]: 'info', [5]: 'debug' } as const;

/**
 * Convert a {@link LoggerLike} logger into a kafkajs logger.
 */
export function kafkaLogCreator(logger: LoggerLike): logCreator {
  return () =>
    ({ level, log: { message, ...extra } }) => {
      logger[stringLevel[level]](message, extra);
    };
}

/**
 * A producer function, that has topic and schema baked in
 * Only needing the contents of the messages and the a {@link KafkaProducerService} object.
 *
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export type Produce<TValue, TKey> = (
  producer: KafkaProducerService,
  messages: EncodedMessage<TValue, TKey>[],
) => Promise<RecordMetadata[]>;

/**
 * A helper to create a producer function, with "baked in" topic and schema names
 *
 * ```typescript
 * const mySend = produce({ topic: 'my-topic', schema: mySchema });
 * await mySend(producer, [{ value: { ... }, partition: 1 }]);
 * ```
 *
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export function produce<TValue, TKey = Buffer | string | null>(config: {
  topic: string;
  schema: ConfluentSchema;
  keySchema?: ConfluentSchema;
}): Produce<TValue, TKey> {
  return (producer, messages) => producer.sendWithSchema<TValue, TKey>({ ...config, messages });
}
