import { randomBytes } from 'crypto';
import { join } from 'path';
import { Pool } from 'pg';
import axios from 'axios';
import { Kafka } from 'kafkajs';
import { readAVSC, SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { run } from '@ovotech/laminar';
import { kafkaLogCreator, KafkaProducerService, KafkaAdminService, registerSchemas } from '@ovotech/laminar-kafkajs';
import { PgService } from '@ovotech/laminar-pg';
import * as nock from 'nock';
import { retry } from 'ts-retry-promise';
import { createApplication } from '../src/application';
import { EnvVars } from '../src/env';
import { Feedback } from '../src/__generated__/feedback.avsc';

/**
 * Our test would use a unique data so each test run remains isolated
 */
const uniqueTestRun = randomBytes(5).toString('hex');

const env: EnvVars = {
  HOST: 'localhost',
  KAFKA_BROKER: 'localhost:29092',
  SCHEMA_REGISTRY: 'http://localhost:8081',
  TOPIC: `test-comms-feedback-${uniqueTestRun}`,
  GROUP_ID: 'test-comms-feedback-consumer',
  EMAIL_API: 'http://email.example.com',
  PG: 'postgres://example-admin:example-pass@localhost:5432/example',
  PORT: '4450',
};

/**
 * We define a mocked logger so we don't get flooded with log messages.
 * This can be changed to "console" so you can see the app's output
 */
const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('Comms Integration Tests', () => {
  it('Should work as a comms services', async () => {
    /**
     * All the kafka connections takes a lot of time, so we need to wait a bit more than 5 seconds
     */
    jest.setTimeout(15000);

    const app = await createApplication(env, logger);

    /**
     * We create a separate test-only kafka / schema registry connection, so we can produce test messages
     */
    const kafka = new Kafka({ brokers: [env.KAFKA_BROKER], logCreator: kafkaLogCreator(logger) });
    const schemaRegistry = new SchemaRegistry({ host: env.SCHEMA_REGISTRY });
    /**
     * A custom connection to clear out the comms table so our tests are isolated
     */
    const pool = new Pool({ connectionString: env.PG });

    /**
     * Now we create several test-only services, to be added to the init queue
     */
    // << KafkaProducerService
    const producer = new KafkaProducerService(kafka, schemaRegistry, {
      register: registerSchemas({ [env.TOPIC]: readAVSC(join(__dirname, '../avro/feedback.avsc')) }),
    });
    // KafkaProducerService
    const db = new PgService(pool);
    /**
     * We use the kafka admin to create (and then delete) the test topic
     */
    const admin = new KafkaAdminService(kafka, { topics: [{ topic: env.TOPIC }] });

    /**
     * A client to talk to the test app's http serveer
     */
    const client = axios.create({ baseURL: `http://${env.HOST}:${env.PORT}` });

    /**
     * We start the app, alongside our own test service
     */
    await run({ ...app, initOrder: [[admin, producer, db], ...app.initOrder] }, async () => {
      await db.pool.query('DELETE FROM comms');

      /**
       * We mock out what the response of the comm api will be, the one that our service depends on
       */
      nock(env.EMAIL_API)
        .post('/communication')
        .reply(200, { commId: `test-${uniqueTestRun}`, status: 'Pending' }, { 'Content-Type': 'application/json' });

      const newComm = await client.post('/comms', { email: 'test@example.com' });

      expect(newComm).toMatchObject({
        status: 200,
        data: { status: 'Pending', commId: expect.any(String), id: expect.any(Number) },
      });

      // << send
      await producer.send<Feedback>({
        topic: env.TOPIC,
        messages: [{ value: { commId: `test-${uniqueTestRun}`, status: 'Delivered' } }],
      });
      // send

      /**
       * Wait for our service to consume the feedback message and set its comm status to delivered
       */
      await retry(
        async () => {
          const comm = await client.get(`/comms/${newComm.data.id}`);
          expect(comm.data.status).toEqual('Delivered');
        },
        { delay: 1000, retries: 10 },
      );
    });
  });
});
