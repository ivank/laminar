import type { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { ConfluentSchema, RawAvroSchema } from '@kafkajs/confluent-schema-registry/dist/@types';
import type { Kafka, Producer, ProducerConfig, RecordMetadata, ProducerRecord } from 'kafkajs';
import { Middleware, Service } from '@ovotech/laminar';
import { EncodedProducerRecord, EncodedSchemaProducerRecord } from './types';

/**
 * A function to be called with the schema registry that will pre-register all schemas you'll be producing.
 * @category kafka
 */
export type RegisterSchemas = (schemaRegistry: SchemaRegistry) => Promise<Map<string, number>>;

export interface RegisterSchemasConfig {
  /**
   * A function to be called with the schema registry that will pre-register all schemas you'll be producing.
   */
  register?: RegisterSchemas;
}

/**
 * The context added by {@link producerMiddleware}
 */
export interface ProducerContext {
  producer: KafkaProducerService;
}

/**
 * A generic middleware to pass on the {@link KafkaProducerService} instance inside the function call.
 */
export function producerMiddleware(producer: KafkaProducerService): Middleware<ProducerContext> {
  return (next) => (payload) => next({ ...payload, producer });
}

/**
 * Encode a the record value, using schemaRegistry and a given registry schema id.
 */
export async function toProducerRecord<TValue>(
  id: number,
  schemaRegistry: SchemaRegistry,
  { messages, ...rest }: EncodedProducerRecord<TValue>,
): Promise<ProducerRecord> {
  return {
    ...rest,
    messages: await Promise.all(
      messages.map(async (message) => ({ ...message, value: await schemaRegistry.encode(id, message.value) })),
    ),
  };
}

/**
 * Pre-register schemas in the schema registry. This will add / load them from the registry and cache them, so they can be used for producing records
 */
export function registerSchemas(register: { [topic: string]: ConfluentSchema | RawAvroSchema }): RegisterSchemas {
  return async (schemaRegistry) =>
    new Map(
      await Promise.all(
        Object.entries(register).map<Promise<[string, number]>>(async ([topic, schema]) => {
          const subject = `${topic}-value`;
          const { id } = await schemaRegistry.register(schema, { subject });
          return [subject, id];
        }),
      ),
    );
}

/**
 * A class that wraps [kafkajs Producer](https://kafka.js.org/docs/producing) and implements laminar {@link Service}, so lamniar can handle its lifecycle.
 * It can also pre-load schema registries so they can be used for encoding messages.
 */
export class KafkaProducerService implements Service {
  public producer: Producer;
  public register: Map<string, number> = new Map();

  constructor(
    public kafka: Kafka,
    public schemaRegistry: SchemaRegistry,
    public config: ProducerConfig & RegisterSchemasConfig = {},
  ) {
    this.producer = kafka.producer(config);
  }

  /**
   * Produce messages to a given topic. Topic must be pre-registered when constructing the {@link KafkaProducerService} instance
   */
  public async send<TValue>(record: EncodedProducerRecord<TValue>): Promise<RecordMetadata[]> {
    const subject = `${record.topic}-value`;
    const id = this.register.get(subject);
    if (!id) {
      throw new Error(
        `Cannot produce message, no schema registered for subject ${subject}. You need to add it to the topics config of the ProducerService or use sendWithSchema method.`,
      );
    }

    return await this.producer.send(await toProducerRecord(id, this.schemaRegistry, record));
  }

  /**
   * Produce messages with a given schema.
   */
  public async sendWithSchema<TValue>(record: EncodedSchemaProducerRecord<TValue>): Promise<RecordMetadata[]> {
    const { id } = await this.schemaRegistry.register(record.schema, { subject: `${record.topic}-value` });
    return await this.producer.send(await toProducerRecord(id, this.schemaRegistry, record));
  }

  /**
   * Send raw Buffer, without encoding with the schema registry
   */
  public async sendBuffer(record: ProducerRecord): Promise<RecordMetadata[]> {
    return await this.producer.send(record);
  }

  public async start(): Promise<this> {
    await this.producer.connect();
    if (this.config.register) {
      this.register = await this.config.register(this.schemaRegistry);
    }
    return this;
  }

  public async stop(): Promise<this> {
    await this.producer.disconnect();
    return this;
  }

  public describe(): string {
    const topics = [...this.register.entries()].map(([topic, id]) => `${topic} (${id})`).join(', ');
    return `📤 Kafka Producer: ${topics}`;
  }
}
