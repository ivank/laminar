import {
  KafkaConsumerService,
  KafkaProducerService,
  EachBatchConsumer,
  kafkaLogCreator,
  registerSchemas,
  KafkaAdminService,
} from '../src';
import { LoggerLike, Middleware, start, stop } from '@ovotech/laminar';
import { retry } from 'ts-retry-promise';
import * as uuid from 'uuid';
import { Kafka } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { SchemaType } from '@kafkajs/confluent-schema-registry/dist/@types';

export interface LoggerContext {
  logger: LoggerLike;
}

export const loggerMiddleware =
  (logger: LoggerLike): Middleware<LoggerContext> =>
  (next) =>
  (ctx) =>
    next({ ...ctx, logger });

export interface Event2 {
  field2: string;
}

export const Event2Schema = {
  type: 'record',
  name: 'Event2',
  namespace: 'com.example.event',
  fields: [{ name: 'field2', type: 'string' }],
} as const;

const topic2 = `test-batch-${uuid.v4()}`;

const groupId2 = `test-group-2-${uuid.v4()}`;
const data: { [key: number]: string[] } = { 0: [], 1: [] };

const eachEvent2: EachBatchConsumer<Event2, Buffer, LoggerContext> = async ({ batch, logger }) => {
  for (const msg of batch.messages) {
    if (msg.decodedValue) {
      data[batch.partition].push(msg.decodedValue.field2);
      logger.info(msg.decodedValue.field2);
    }
  }
};

const logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() };
const logging = loggerMiddleware(logger);
const logCreator = kafkaLogCreator(logger);

describe('Integration', () => {
  jest.setTimeout(60000);
  it('Should process response', async () => {
    const kafka = new Kafka({ brokers: ['localhost:29092'], logCreator });
    const schemaRegistry = new SchemaRegistry({ host: 'http://localhost:8081' });
    const admin = new KafkaAdminService(kafka, { topics: [{ topic: topic2, numPartitions: 2 }] });

    const event2Service = new KafkaConsumerService<Event2>(kafka, schemaRegistry, {
      topics: [topic2],
      groupId: groupId2,
      fromBeginning: true,
      eachBatch: logging(eachEvent2),
    });

    const producer = new KafkaProducerService(kafka, schemaRegistry, {
      register: registerSchemas({
        [`${topic2}-value`]: { type: SchemaType.AVRO, schema: JSON.stringify(Event2Schema) },
      }),
    });

    const initOrder = [admin, producer, event2Service];

    try {
      await start({ initOrder, logger });

      await producer.send<Event2>({
        topic: topic2,
        messages: [
          { value: { field2: 'test5' }, partition: 1, key: '5' },
          { value: { field2: 'test6' }, partition: 1, key: '6' },
          { value: { field2: 'test7' }, partition: 0, key: '7' },
        ],
      });

      await retry(
        async () => {
          expect(data).toEqual({
            0: expect.arrayContaining(['test7']),
            1: expect.arrayContaining(['test5', 'test6']),
          });
          expect(logger.info).toHaveBeenCalledWith('test5');
          expect(logger.info).toHaveBeenCalledWith('test6');
          expect(logger.info).toHaveBeenCalledWith('test7');
        },
        { delay: 1000, retries: 30 },
      );
    } finally {
      await stop({ initOrder, logger });
      await new Promise((res) => setTimeout(res, 1000));
    }
  });
});
