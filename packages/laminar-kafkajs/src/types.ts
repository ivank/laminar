import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { ConfluentSchema, RawAvroSchema } from '@kafkajs/confluent-schema-registry/dist/@types';
import type {
  KafkaMessage,
  EachMessagePayload,
  Batch,
  EachBatchPayload,
  ConsumerRunConfig,
  Message,
  ProducerRecord,
} from 'kafkajs';
import { AbstractMiddleware, Empty } from '@ovotech/laminar';

/**
 * Kafka Message that's been decoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface DecodedKafkaMessage<TValue, TKey> extends KafkaMessage {
  decodedValue: TValue | null;
  decodedKey: TKey | null;
}

/**
 * A payload for [eachMessage](https://kafka.js.org/docs/consuming#a-name-each-message-a-eachmessage)
 * where the message has been decoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface DecodedEachMessagePayload<TValue, TKey> extends EachMessagePayload {
  schemaRegistry: SchemaRegistry;
  message: DecodedKafkaMessage<TValue, TKey>;
}

/**
 * Batch of Kafka Messages that's been decoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface DecodedBatch<TValue, TKey> extends Batch {
  messages: DecodedKafkaMessage<TValue, TKey>[];
}

/**
 * A payload for [eachBatch](https://kafka.js.org/docs/consuming#a-name-each-batch-a-eachbatch)
 * where each message has been decoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface DecodedEachBatchPayload<TValue, TKey> extends EachBatchPayload {
  schemaRegistry: SchemaRegistry;
  batch: DecodedBatch<TValue, TKey>;
}

/**
 * A consumer function to be passed to {@link KafkaConsumerService}
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 * @typeParam TContext The context that this consumer requires to exeecute
 */
export type EachMessageConsumer<TValue, TKey, TContext extends Empty = Empty> = (
  payload: DecodedEachMessagePayload<TValue, TKey> & TContext,
) => Promise<void>;

/**
 * A batch consumer function to be passed to {@link KafkaConsumerService}
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 * @typeParam TContext The context that this consumer requires to exeecute
 */
export type EachBatchConsumer<TValue, TKey, TContext extends Empty = Empty> = (
  payload: DecodedEachBatchPayload<TValue, TKey> & TContext,
) => Promise<void>;

/**
 * A [consumer run configuration](https://kafka.js.org/docs/consuming),
 * where `eachMessage` / `eachBatch` have been updated to include {@link DecodedKafkaMessage} / {@link DecodedBatch}
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface SchemaRegistryConsumerRunConfig<TValue, TKey = Buffer | null>
  extends Omit<ConsumerRunConfig, 'eachMessage' | 'eachBatch'> {
  decodeKey?: boolean;
  eachMessage?: EachMessageConsumer<TValue, TKey>;
  eachBatch?: EachBatchConsumer<TValue, TKey>;
}

/**
 * A message to be encoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export interface EncodedMessage<TValue, TKey> extends Omit<Message, 'value' | 'key'> {
  value: TValue;
  key: TKey | null;
}

/**
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export interface EncodedProducerRecord<TValue, TKey> extends Omit<ProducerRecord, 'messages'> {
  messages: EncodedMessage<TValue, TKey>[];
}

/**
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export interface EncodedSchemaProducerRecord<TValue, TKey> extends EncodedProducerRecord<TValue, TKey> {
  schema: ConfluentSchema | RawAvroSchema;
  keySchema?: ConfluentSchema | RawAvroSchema;
}

/**
 * Middleware for {@link EachMessageConsumer}
 */
export type EachMessageeMiddleware = AbstractMiddleware<DecodedEachMessagePayload<unknown, unknown>, void>;

/**
 * Middleware for {@link EachBatchConsumer}
 */
export type EachBatchMiddleware = AbstractMiddleware<DecodedEachBatchPayload<unknown, unknown>, void>;
