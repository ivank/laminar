import { Application, HttpService, LoggerLike, loggerMiddleware, requestLoggingMiddleware } from '@laminarjs/laminar';
import { WinstonService } from '@laminarjs/winston';
import { jobLoggingMiddleware, QueueService, queueMiddleware, QueueWorkerService } from '@laminarjs/pgboss';
import { PgService, pgMiddleware } from '@laminarjs/pg';
import { KafkaConsumerService, kafkaLogCreator } from '@laminarjs/kafkajs';
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';
import PgBoss from 'pg-boss';
import { Kafka, logLevel } from 'kafkajs';
import { Pool } from 'pg';
import { meterReadsConsumer } from './services/consumers/meter-reads.consumer';
import { EnvVars } from './env';
import { httpListener } from './services/http/http.listener';
import { importWorker } from './services/queue/import.worker';
import { createLogger, transports } from 'winston';
import { consoleTransportFormat } from './logger';
import { AvroTimestampMillis, AvroDecimal } from '@laminarjs/avro';

/**
 * The main function of our project
 * Will create all the services it consists of and return them so we can start each one as needed.
 * Only depend on the environment variables, so we can test to as close to prod setting as possible, while not spawining any processes.
 *y
 * @param env The validated object of environment variables, should come from process.env
 */
export const createApplication = async (env: EnvVars): Promise<Application> => {
  /**
   * Dependencies
   * ------------------------------------------------------------------------------
   * We create all the clients and external interfaces that our services depend on.
   * Everything here is only external dependencies.
   * If this grows too big we can move this to its own function.
   */

  const winston = createLogger({
    transports: [new transports.Console({ format: consoleTransportFormat })],
    level: env.LOG_LEVEL,
  });
  const kafka = new Kafka({
    brokers: [env.KAFKA_BROKER],
    logCreator: kafkaLogCreator(winston),
    logLevel: logLevel.ERROR,
  });
  const schemaRegistry = new SchemaRegistry(
    { host: env.KAFKA_SCHEMA_REGISTRY },
    // We need to specify this type as any since confluent schema is using an old version of avsc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { [SchemaType.AVRO]: { logicalTypes: { 'timestamp-millis': AvroTimestampMillis, decimal: AvroDecimal } as any } },
  );
  const pool = new Pool({ connectionString: env.DB_CONNECTION });
  const pgBoss = new PgBoss({
    connectionString: env.DB_CONNECTION,
    /**
     * Remove timekeep / maintenance / scheduling, so the tests can finish faster
     */
    noScheduling: true,
    noSupervisor: true,
  });

  /**
   * Internal services
   * ------------------------------------------------------------------------------
   *
   * Here we convert the external dependencies into {@link Service} objects, so we can maintain them properly
   * {@link Service} implements start(), stop() and describe() methods, which are used to mainain their lifecycles
   */

  const pg = new PgService(pool);
  const queue = new QueueService(pgBoss);
  const logger: LoggerLike = new WinstonService(winston);

  /**
   * Middlewares
   * ------------------------------------------------------------------------------
   *
   * Use the internal services to create all the middlewares we'll need for our external services.
   *
   * Those allow us to run some code, based on those internal services, on each request / consumption / worker run.
   *
   * For example the {@link pgMiddleware} will use the {@link PgService} to get a connection from the pool and use it.
   * That way every request will have its own connection, so there's no chance of transactions from one request affecting another.
   */

  const withDb = pgMiddleware({ db: pg });
  const withLogger = loggerMiddleware(logger);
  const withJobLogging = jobLoggingMiddleware(logger);
  const withQueue = queueMiddleware(queue);
  const withRequestLogging = requestLoggingMiddleware(logger);

  /**
   * Services
   * ------------------------------------------------------------------------------
   *
   * Here we create our Services that will do the actual business logic.
   * Since its an array, all of them will be started in parallel.
   */
  const services = [
    new QueueWorkerService(queue, {
      name: 'import',
      worker: withDb(withJobLogging(importWorker)),
    }),
    new KafkaConsumerService(kafka, schemaRegistry, {
      topics: [env.KAFKA_TOPIC_METER_READ],
      groupId: `${env.KAFKA_GROUP_ID}-test-1`,
      fromBeginning: true,
      eachMessage: withLogger(withDb(meterReadsConsumer)),
    }),
    new HttpService({
      listener: withQueue(withRequestLogging(withDb(await httpListener(env)))),
      hostname: env.HOST,
      port: Number(env.PORT),
    }),
  ];

  return { initOrder: [[pg, queue], services], logger };
};
