import {
  KafkaConsumerService,
  KafkaProducerService,
  EachMessageConsumer,
  kafkaLogCreator,
  registerSchemas,
  KafkaAdminService,
} from '../src';
import { LoggerLike, Middleware, start, stop } from '@laminar/laminar';
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

export interface Event1 {
  field1: string;
}

export const Event1Schema = {
  type: 'record',
  namespace: 'com.example.event',
  name: 'Event1',
  fields: [{ name: 'field1', type: 'string' }],
} as const;

const topic1 = `test-single-${uuid.v4()}`;
const groupId1 = `test-group-1-${uuid.v4()}`;
const data: { [key: number]: string[] } = { 0: [], 1: [], 2: [] };

const eachEvent1: EachMessageConsumer<Event1, Buffer, LoggerContext> = async ({ message, partition, logger }) => {
  if (message.decodedValue) {
    data[partition].push(message.decodedValue.field1);
    logger.info(message.decodedValue.field1);
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
    const admin = new KafkaAdminService(kafka, { topics: [{ topic: topic1, numPartitions: 3 }] });

    const event1Service = new KafkaConsumerService<Event1>(kafka, schemaRegistry, {
      topics: [topic1],
      groupId: groupId1,
      fromBeginning: true,
      eachMessage: logging(eachEvent1),
    });

    const producer = new KafkaProducerService(kafka, schemaRegistry, {
      register: registerSchemas({
        [`${topic1}-value`]: { type: SchemaType.AVRO, schema: JSON.stringify(Event1Schema) },
      }),
    });

    const initOrder = [admin, producer, event1Service];

    try {
      await start({ initOrder, logger });

      await Promise.all([
        producer.send<Event1>({ topic: topic1, messages: [{ value: { field1: 'test1' }, partition: 0, key: '1' }] }),
        producer.send<Event1>({
          topic: topic1,
          messages: [
            { value: { field1: 'test2' }, partition: 1, key: '2' },
            { value: { field1: 'test3' }, partition: 2, key: '3' },
            { value: { field1: 'test4' }, partition: 0, key: '4' },
          ],
        }),
      ]);

      await retry(
        async () => {
          expect(data).toEqual({
            0: expect.arrayContaining(['test1', 'test4']),
            1: ['test2'],
            2: ['test3'],
          });

          expect(logger.info).toHaveBeenCalledWith('test1');
          expect(logger.info).toHaveBeenCalledWith('test2');
          expect(logger.info).toHaveBeenCalledWith('test3');
          expect(logger.info).toHaveBeenCalledWith('test4');
        },
        { delay: 1000, retries: 30 },
      );
    } finally {
      await stop({ initOrder, logger });
      await new Promise((res) => setTimeout(res, 1000));
    }
  });
});
