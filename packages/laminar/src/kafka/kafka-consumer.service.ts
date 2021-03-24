import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { Service } from '../types';
import type { Kafka, ConsumerSubscribeTopic, ConsumerConfig, Consumer } from 'kafkajs';
import { SchemaRegistryConsumerRunConfig, DecodedKafkaMessage, DecodedEachBatchPayload } from './types';

/**
 * A class that wraps [kafkajs Consumer](https://kafka.js.org/docs/consuming) and implements laminar {@link Service}, so lamniar can handle its lifecycle.
 * When service service starts, subscribe to the topic and call kafkajs consumer `run` method.
 *
 * On each message / each batch, decode the message using schemaRegistry and pass it as `decodedValue` next to the `value` param.
 *
 * @typeParam TValue The decodeed type of the the kafka message value
 * @category kafka
 */
export class KafkaConsumerService<TValue> implements Service {
  public consumer: Consumer;

  constructor(
    public kafka: Kafka,
    public schemaRegistry: SchemaRegistry,
    public config: SchemaRegistryConsumerRunConfig<TValue> & ConsumerConfig & ConsumerSubscribeTopic,
  ) {
    this.consumer = kafka.consumer(config);
  }

  public async start(): Promise<this> {
    await this.consumer.connect();
    await this.consumer.subscribe(this.config);

    const { eachMessage, eachBatch, ...config } = this.config;

    await this.consumer.run({
      ...config,
      eachMessage: eachMessage
        ? async (payload) =>
            eachMessage({
              ...payload,
              schemaRegistry: this.schemaRegistry,
              message: {
                ...payload.message,
                decodedValue: payload.message.value ? await this.schemaRegistry.decode(payload.message.value) : null,
              },
            })
        : undefined,
      eachBatch: eachBatch
        ? async (payload) => {
            for (const i in payload.batch.messages) {
              const value = payload.batch.messages[i].value;
              (payload.batch.messages[i] as DecodedKafkaMessage<TValue>).decodedValue = value
                ? await this.schemaRegistry.decode(value)
                : null;
            }
            return eachBatch(payload as DecodedEachBatchPayload<TValue>);
          }
        : undefined,
    });

    return this;
  }

  public async stop(): Promise<this> {
    await this.consumer.disconnect();
    return this;
  }

  public describe(): string {
    return `📥 Kafka Consumer ${this.config.topic}, group: ${this.config.groupId}`;
  }
}
