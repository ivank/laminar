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
export interface DecodedKafkaMessage<TValue> extends KafkaMessage {
  decodedValue: TValue | null;
}

/**
 * A payload for [eachMessage](https://kafka.js.org/docs/consuming#a-name-each-message-a-eachmessage)
 * where the message has been decoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface DecodedEachMessagePayload<TValue> extends EachMessagePayload {
  schemaRegistry: SchemaRegistry;
  message: DecodedKafkaMessage<TValue>;
}

/**
 * Batch of Kafka Messages that's been decoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface DecodedBatch<TValue> extends Batch {
  messages: DecodedKafkaMessage<TValue>[];
}

/**
 * A payload for [eachBatch](https://kafka.js.org/docs/consuming#a-name-each-batch-a-eachbatch)
 * where each message has been decoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface DecodedEachBatchPayload<TValue> extends EachBatchPayload {
  schemaRegistry: SchemaRegistry;
  batch: DecodedBatch<TValue>;
}

/**
 * A consumer function to be passed to {@link KafkaConsumerService}
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 * @typeParam TContext The context that this consumer requires to exeecute
 */
export type EachMessageConsumer<TValue, TContext extends Empty = Empty> = (
  payload: DecodedEachMessagePayload<TValue> & TContext,
) => Promise<void>;

/**
 * A batch consumer function to be passed to {@link KafkaConsumerService}
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 * @typeParam TContext The context that this consumer requires to exeecute
 */
export type EachBatchConsumer<TValue, TContext extends Empty = Empty> = (
  payload: DecodedEachBatchPayload<TValue> & TContext,
) => Promise<void>;

/**
 * A [consumer run configuration](https://kafka.js.org/docs/consuming),
 * where `eachMessage` / `eachBatch` have been updated to include {@link DecodedKafkaMessage} / {@link DecodedBatch}
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export interface SchemaRegistryConsumerRunConfig<TValue> extends Omit<ConsumerRunConfig, 'eachMessage' | 'eachBatch'> {
  eachMessage?: EachMessageConsumer<TValue>;
  eachBatch?: EachBatchConsumer<TValue>;
}

/**
 * A message to be encoded with [kafkajs SchemaRegistry](https://github.com/kafkajs/confluent-schema-registry)
 *
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export interface EncodedMessage<TValue> extends Omit<Message, 'value'> {
  value: TValue;
}

/**
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export interface EncodedProducerRecord<TValue> extends Omit<ProducerRecord, 'messages'> {
  messages: EncodedMessage<TValue>[];
}

/**
 * @typeParam TValue The type of the the kafka message value, before its encoded
 */
export interface EncodedSchemaProducerRecord<TValue> extends EncodedProducerRecord<TValue> {
  schema: ConfluentSchema | RawAvroSchema;
}

/**
 * Middleware for {@link EachMessageConsumer}
 */
export type EachMessageeMiddleware = AbstractMiddleware<DecodedEachMessagePayload<unknown>, void>;

/**
 * Middleware for {@link EachBatchConsumer}
 */
export type EachBatchMiddleware = AbstractMiddleware<DecodedEachBatchPayload<unknown>, void>;
