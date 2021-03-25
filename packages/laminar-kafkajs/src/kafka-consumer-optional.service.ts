import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { Kafka, ConsumerSubscribeTopic, ConsumerConfig } from 'kafkajs';
import { KafkaConsumerService } from './kafka-consumer.service';
import { SchemaRegistryConsumerRunConfig } from './types';

/**
 * Optionally start a consumer group to consume a kafka topic.
 * Start it only if the topic name is not undefined, otherwise skip it.
 *
 * Otherwise behaves same ways as {@link KafkaConsumerService}
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 */
export class KafkaConsumerOptionalService<TValue> extends KafkaConsumerService<TValue> {
  public isActive = false;

  constructor(
    kafka: Kafka,
    schemaRegistry: SchemaRegistry,
    config: SchemaRegistryConsumerRunConfig<TValue> & ConsumerConfig & Partial<ConsumerSubscribeTopic>,
  ) {
    super(kafka, schemaRegistry, { topic: '', ...config });
    this.isActive = config.topic !== undefined;
  }

  public async start(): Promise<this> {
    return this.isActive ? super.start() : this;
  }

  public async stop(): Promise<this> {
    return this.isActive ? super.stop() : this;
  }

  public describe(): string {
    return this.isActive
      ? `📥 Optional Kafka Consumer ${this.config.topic}, group: ${this.config.groupId}`
      : `📥 Optional Kafka Consumer [SKIPPED] group: ${this.config.groupId}`;
  }
}
