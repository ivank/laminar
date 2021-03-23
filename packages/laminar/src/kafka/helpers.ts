import type { ConfluentSchema } from '@kafkajs/confluent-schema-registry/dist/@types';
import type { logCreator, RecordMetadata } from 'kafkajs';
import { LoggerLike } from '../logger';
import { KafkaProducerService } from './kafka-producer.service';
import { EncodedMessage } from './types';

const stringLevel = { [0]: 'error', [1]: 'error', [2]: 'warn', [4]: 'info', [5]: 'debug' } as const;

/**
 * Convert a {@link LoggerLike} logger into a kafkajs logger.
 */
export const kafkaLogCreator = (logger: LoggerLike): logCreator => () => ({ level, log: { message, ...extra } }) => {
  logger[stringLevel[level]](message, extra);
};

/**
 * A producer function, that has topic and schema baked in
 * Only needing the contents of the messages and the a {@link KafkaProducerService} object.
 */
export type Produce<TValue> = (
  producer: KafkaProducerService,
  messages: EncodedMessage<TValue>[],
) => Promise<RecordMetadata[]>;

/**
 * A helper to create a producer function, with "baked in" topic and schema names
 */
export const produce = <TValue>(config: { topic: string; schema: ConfluentSchema }): Produce<TValue> => (
  producer,
  messages,
) => producer.sendWithSchema<TValue>({ ...config, messages });
