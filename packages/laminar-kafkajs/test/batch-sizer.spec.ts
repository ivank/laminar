import {
  KafkaConsumerService,
  KafkaProducerService,
  chunkBatchMiddleware,
  kafkaLogCreator,
  produce,
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
export interface Key2 {
  id: string;
}

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

const topic3 = `test-sized-batch-${uuid.v4()}`;
const groupId3 = `test-group-3-${uuid.v4()}`;

const sendEvent3 = produce<Event2, Key2>({
  topic: topic3,
  schema: { type: SchemaType.AVRO, schema: JSON.stringify(Event2Schema) },
  keySchema: { type: SchemaType.AVRO, schema: JSON.stringify(Key2Schema) },
});

const logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() };

const logCreator = kafkaLogCreator(logger);

const batchSizer = jest.fn();

describe('Integration', () => {
  jest.setTimeout(60000);
  it('Should process response', async () => {
    const kafka = new Kafka({ brokers: ['localhost:29092'], logCreator });
    const schemaRegistry = new SchemaRegistry({ host: 'http://localhost:8081' });
    const admin = new KafkaAdminService(kafka, { topics: [{ topic: topic3, numPartitions: 1 }] });

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

    const producer = new KafkaProducerService(kafka, schemaRegistry);

    const initOrder = [admin, producer, event3Service];

    try {
      await start({ initOrder, logger });

      await sendEvent3(producer, [
        { value: { field2: 'p0m1' }, partition: 0, key: { id: 'k1' } },
        { value: { field2: 'p0m2' }, partition: 0, key: { id: 'k2' } },
        { value: { field2: 'p0m3' }, partition: 0, key: { id: 'k3' } },
        { value: { field2: 'p0m4' }, partition: 0, key: { id: 'k4' } },
        { value: { field2: 'p0m5' }, partition: 0, key: { id: 'k5' } },
      ]);

      await retry(
        async () => {
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
        { delay: 1000, retries: 30 },
      );
    } finally {
      await stop({ initOrder, logger });
      await new Promise((res) => setTimeout(res, 1000));
    }
  });
});
