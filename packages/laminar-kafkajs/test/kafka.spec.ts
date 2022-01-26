import {
  KafkaConsumerService,
  KafkaProducerService,
  EachBatchConsumer,
  EachMessageConsumer,
  chunkBatchMiddleware,
  kafkaLogCreator,
  produce,
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

export interface Event1 {
  field1: string;
}
export interface Event2 {
  field2: string;
}
export interface Key2 {
  id: string;
}

export const Event1Schema = {
  type: 'record',
  namespace: 'com.example.event',
  name: 'Event1',
  fields: [{ name: 'field1', type: 'string' }],
} as const;

export const Event2Schema = {
  type: 'record',
  name: 'Event2',
  namespace: 'com.example.event',
  fields: [{ name: 'field2', type: 'string' }],
} as const;

export const Key2Schema = {
  type: 'record',
  name: 'Key2',
  namespace: 'com.example.event',
  fields: [{ name: 'id', type: 'string' }],
} as const;

const topic1 = `test-single-${uuid.v4()}`;
const topic2 = `test-batch-${uuid.v4()}`;
const topic3 = `test-sized-batch-${uuid.v4()}`;

const groupId1 = `test-group-1-${uuid.v4()}`;
const groupId2 = `test-group-2-${uuid.v4()}`;
const groupId3 = `test-group-3-${uuid.v4()}`;
const data: { [key: number]: string[] } = { 0: [], 1: [], 2: [] };

const sendEvent3 = produce<Event2, Key2>({
  topic: topic3,
  schema: { type: SchemaType.AVRO, schema: JSON.stringify(Event2Schema) },
  keySchema: { type: SchemaType.AVRO, schema: JSON.stringify(Key2Schema) },
});

const eachEvent1: EachMessageConsumer<Event1, Buffer, LoggerContext> = async ({ message, partition, logger }) => {
  if (message.decodedValue) {
    data[partition].push(message.decodedValue.field1);
    logger.info(message.decodedValue.field1);
  }
};

const eachEvent2: EachBatchConsumer<Event2, Buffer, LoggerContext> = async ({ batch, logger }) => {
  for (const msg of batch.messages) {
    if (msg.decodedValue) {
      data[batch.partition].push(msg.decodedValue.field2);
      logger.info(msg.decodedValue.field2);
    }
  }
};

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const logging = loggerMiddleware(logger);
const logCreator = kafkaLogCreator(logger);

const batchSizer = jest.fn();

describe('Integration', () => {
  jest.setTimeout(60000);
  it('Should process response', async () => {
    const kafka = new Kafka({ brokers: ['localhost:29092'], logCreator });
    const schemaRegistry = new SchemaRegistry({ host: 'http://localhost:8081' });

    const admin = new KafkaAdminService(kafka, {
      topics: [
        { topic: topic1, numPartitions: 3 },
        { topic: topic2, numPartitions: 2 },
        { topic: topic3, numPartitions: 1 },
      ],
    });

    const event1Service = new KafkaConsumerService<Event1>(kafka, schemaRegistry, {
      topic: topic1,
      groupId: groupId1,
      fromBeginning: true,
      eachMessage: logging(eachEvent1),
    });

    const event2Service = new KafkaConsumerService<Event2>(kafka, schemaRegistry, {
      topic: topic2,
      groupId: groupId2,
      fromBeginning: true,
      eachBatch: logging(eachEvent2),
    });

    const event3Service = new KafkaConsumerService<Event2, Key2>(kafka, schemaRegistry, {
      topic: topic3,
      fromBeginning: true,
      groupId: groupId3,
      autoCommitInterval: 20000,
      autoCommitThreshold: 2,
      decodeKey: true,
      eachBatch: chunkBatchMiddleware({ size: 2 })(
        async ({ batch: { messages, partition, firstOffset, lastOffset } }) => {
          const commitedOffset = await admin.client?.fetchOffsets({ groupId: groupId3, topic: topic3 });

          batchSizer({
            partition,
            firstOffset: firstOffset(),
            lastOffset: lastOffset(),
            commitedOffset: commitedOffset?.map(({ offset, partition }) => ({
              offset: +offset,
              partition,
            })),
            messages: messages.map(({ decodedValue, decodedKey }) => `${decodedValue?.field2} - ${decodedKey?.id}`),
          });
        },
      ),
    });

    const producer = new KafkaProducerService(kafka, schemaRegistry, {
      register: registerSchemas({
        [`${topic1}-value`]: { type: SchemaType.AVRO, schema: JSON.stringify(Event1Schema) },
        [`${topic2}-value`]: { type: SchemaType.AVRO, schema: JSON.stringify(Event2Schema) },
      }),
    });

    const initOrder = [admin, producer, [event1Service, event2Service, event3Service]];

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
        producer.send<Event2>({
          topic: topic2,
          messages: [
            { value: { field2: 'test5' }, partition: 1, key: '5' },
            { value: { field2: 'test6' }, partition: 1, key: '6' },
            { value: { field2: 'test7' }, partition: 0, key: '7' },
          ],
        }),
        sendEvent3(producer, [
          { value: { field2: 'p0m1' }, partition: 0, key: { id: 'k1' } },
          { value: { field2: 'p0m2' }, partition: 0, key: { id: 'k2' } },
          { value: { field2: 'p0m3' }, partition: 0, key: { id: 'k3' } },
          { value: { field2: 'p0m4' }, partition: 0, key: { id: 'k4' } },
          { value: { field2: 'p0m5' }, partition: 0, key: { id: 'k5' } },
        ]),
      ]);

      await retry(
        async () => {
          expect(data).toEqual({
            0: expect.arrayContaining(['test1', 'test4', 'test7']),
            1: expect.arrayContaining(['test2', 'test5', 'test6']),
            2: ['test3'],
          });

          expect(logger.info).toHaveBeenCalledWith('test1');
          expect(logger.info).toHaveBeenCalledWith('test2');
          expect(logger.info).toHaveBeenCalledWith('test3');
          expect(logger.info).toHaveBeenCalledWith('test4');
          expect(logger.info).toHaveBeenCalledWith('test5');
          expect(logger.info).toHaveBeenCalledWith('test6');
          expect(logger.info).toHaveBeenCalledWith('test7');

          expect(batchSizer).toHaveBeenCalledWith({
            partition: 0,
            messages: ['p0m1 - k1', 'p0m2 - k2'],
            firstOffset: '0',
            lastOffset: '1',
            commitedOffset: expect.arrayContaining([{ partition: 0, offset: -1 }]),
          });
          expect(batchSizer).toHaveBeenCalledWith({
            partition: 0,
            messages: ['p0m3 - k3', 'p0m4 - k4'],
            firstOffset: '2',
            lastOffset: '3',
            commitedOffset: expect.arrayContaining([{ partition: 0, offset: 2 }]),
          });
          expect(batchSizer).toHaveBeenCalledWith({
            partition: 0,
            messages: ['p0m5 - k5'],
            firstOffset: '4',
            lastOffset: '4',
            commitedOffset: expect.arrayContaining([{ partition: 0, offset: 4 }]),
          });
        },
        { delay: 1000, retries: 60 },
      );
    } finally {
      await stop({ initOrder, logger });
    }
  });
});
