import axios from 'axios';
import { run } from '@laminar/laminar';
import { KafkaProducerService } from '@laminar/kafkajs';
import { randomBytes } from 'crypto';
import { createSession } from '@laminar/jwt';
import { createApplication } from '../src/application';
import { EnvVars } from '../src/env';
import { axiosOapi } from './__generated__/schema.axios';
import { retry } from 'ts-retry-promise';
import { Kafka } from 'kafkajs';
import { SchemaRegistry, readAVSC, SchemaType } from '@kafkajs/confluent-schema-registry';
import { join } from 'path';
import { MeterReading } from '../src/__generated__/meter-reading.json';
import Decimal from 'decimal.js';
import { AvroTimestampMillis, AvroDecimal } from '@laminar/avro';

/**
 * An example integration test.
 *
 * Here we setup a test application, with no javascript mocks, just by chaning the env variables.
 *
 * We then proceed to use its public interface (http / kafka) to send it test messages,
 * and then use its public interface again to verify the state.
 *
 * By relying only on that interface we make sure we're free to refactor the internals however we want.
 * The external interface is also the one that should be changing the least, since other services / people will be dependent on it.
 */
describe('Data Loader Integration Tests', () => {
  /**
   * Since this is going to be a long "story" driven test, we need to increase the default jest timeout of 5s
   */
  jest.setTimeout(20000);
  it('Should work as a data loader', async () => {
    /**
     * We define a unique token that will be used through this test,
     * ensuring that we maintain test isolation and we can run this test many times and in parallel with others
     */
    const uniqueTestRun = randomBytes(5).toString('hex');

    /**
     * The test environment variables that our app needs to start.
     */
    const env: EnvVars = {
      HOST: 'localhost',
      PORT: '4800',
      SECRET: 'TEST_SECRET',
      DB_CONNECTION: 'postgres://example-admin:example-pass@localhost:5432/example',
      KAFKA_BROKER: 'localhost:29092',
      /**
       * Custom group Id allows us to maintain isolation. This would insuree create a new consumer group for each test run
       */
      KAFKA_GROUP_ID: `test-${uniqueTestRun}`,
      /**
       * Custom topic names ensures test isolation, so that we do not mix the messages from other tests.
       */
      KAFKA_TOPIC_METER_READ: `meter-read-${uniqueTestRun}`,
      KAFKA_SCHEMA_REGISTRY: 'http://localhost:8081',

      /**
       * By specifying the log level as error we should see any problems, caused from our test run.
       * In normal operation though we should see minimal output.
       */
      LOG_LEVEL: 'error',
    };

    const app = await createApplication(env);

    /**
     * Create a session to allow us to access the service.
     * We are using the same security mechanism as normal operations (without mocking it in any way),
     */
    const { jwt } = createSession({ secret: env.SECRET }, { email: 'me@example.com', scopes: ['read', 'update'] });

    /**
     * We create a typed axios instance, by relying on @laminar/cli package.
     * By running `yarn build:test` before test runs we can take advantage of the OpenApi schema even in the tests.
     */
    const client = axiosOapi(
      axios.create({ baseURL: 'http://localhost:4800', headers: { Authorization: `Bearer ${jwt}` } }),
    );

    /**
     * We start the application, run the tests, and then wait for it to shut down properly.
     */
    await run(app, async () => {
      /**
       * First we need to make sure theere are no items for our given test run serial number
       */
      const meterReadsEmpty = await client['GET /v1/meter-reads']({ params: { serialNumber: uniqueTestRun } });

      expect(meterReadsEmpty).toMatchObject({ status: 200, data: [] });

      /**
       * Next we upload a csv with some test values
       */
      await client['POST /v1/hydration/meter-reads'](
        [
          `"serialNumber","value","date"`,
          `"${uniqueTestRun}","12.2","2020-01-01"`,
          `"${uniqueTestRun}","10.2","2020-02-01"`,
        ].join('\n'),
        { headers: { 'content-type': 'text/csv' } },
      );

      /**
       * Now we use retry to poll our application while we wait for it to process the csv.
       * We will attempt 10 times each 0.5s until we get a positive response
       */
      await retry(
        async () => {
          const meterReadsFromCsv = await client['GET /v1/meter-reads']({ params: { serialNumber: uniqueTestRun } });

          expect(meterReadsFromCsv).toMatchObject({
            status: 200,
            data: [
              { serialNumber: uniqueTestRun, value: '12.2', date: '2020-01-01T00:00:00.000Z' },
              { serialNumber: uniqueTestRun, value: '10.2', date: '2020-02-01T00:00:00.000Z' },
            ],
          });
        },
        { delay: 500, retries: 10 },
      );

      /**
       * We are ready to test our kafka consumers
       * First we need to setup the producer.
       * We instantiate it here, but ideal this could be done in a test helper somewhere.
       *
       * We use the {@link KafkaProducerService} so we can call "start" and stop with a familiar interface.
       */
      const producer = new KafkaProducerService(
        new Kafka({ brokers: [env.KAFKA_BROKER] }),
        new SchemaRegistry(
          { host: env.KAFKA_SCHEMA_REGISTRY },
          {
            [SchemaType.AVRO]: {
              // We need to specify this type as any since confluent schema is using an old version of avsc
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              logicalTypes: { 'timestamp-millis': AvroTimestampMillis, decimal: AvroDecimal } as any,
            },
          },
        ),
      );

      try {
        await producer.start();

        /**
         * Send out some messages with a given schema.
         */
        await producer.sendWithSchema<MeterReading>({
          topic: env.KAFKA_TOPIC_METER_READ,
          schema: readAVSC(join(__dirname, '../src/services/consumers/avro/meter-reading.json')),
          messages: [
            {
              value: {
                metadata: { eventId: uniqueTestRun, traceToken: uniqueTestRun, createdAt: new Date() },
                serialNumber: uniqueTestRun,
                value: new Decimal(3.2),
                date: new Date('2020-02-02T00:00:00.000Z'),
              },
              key: `${uniqueTestRun}-1`,
            },
            {
              value: {
                metadata: { eventId: uniqueTestRun, traceToken: uniqueTestRun, createdAt: new Date() },
                serialNumber: uniqueTestRun,
                value: new Decimal(6.2),
                date: new Date('2020-03-02T00:00:00.000Z'),
              },
              key: `${uniqueTestRun}-2`,
            },
          ],
        });

        /**
         * And lastly we'll poll again, this time waiting for the kafka messages to be consumed and saved in the database.
         */
        await retry(
          async () => {
            const meterReadsFromCsv = await client['GET /v1/meter-reads']({ params: { serialNumber: uniqueTestRun } });

            expect(meterReadsFromCsv).toMatchObject({
              status: 200,
              data: [
                { serialNumber: uniqueTestRun, value: '12.2', date: '2020-01-01T00:00:00.000Z' },
                { serialNumber: uniqueTestRun, value: '10.2', date: '2020-02-01T00:00:00.000Z' },
                { serialNumber: uniqueTestRun, value: '3.2', date: '2020-02-02T00:00:00.000Z' },
                { serialNumber: uniqueTestRun, value: '6.2', date: '2020-03-02T00:00:00.000Z' },
              ],
            });
          },
          { delay: 500, retries: 10 },
        );
      } finally {
        await producer.stop();
      }
    });
  });
});
