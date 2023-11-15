import {
  Application,
  HttpService,
  requestLoggingMiddleware,
  LoggerLike,
  passThroughMiddleware,
} from '@ovotech/laminar';
import { pgMiddleware, PgService } from '@ovotech/laminar-pg';
import { KafkaConsumerService, kafkaLogCreator } from '@ovotech/laminar-kafkajs';
import { Kafka } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import axios, { AxiosInstance } from 'axios';
import { Pool } from 'pg';
import { EnvVars } from './env';
import { httpListener } from './http.listener';
import { feedbackConsumer } from './feedback.consumer';

export interface CommsApiContext {
  commsApi: AxiosInstance;
}

// << application
export const createApplication = async (env: EnvVars, logger: LoggerLike): Promise<Application> => {
  /**
   * Dependencies
   */
  const pool = new Pool({ connectionString: env.PG });
  const kafka = new Kafka({ brokers: [env.KAFKA_BROKER], logCreator: kafkaLogCreator(logger) });
  const schemaRegistry = new SchemaRegistry({ host: env.SCHEMA_REGISTRY });

  /**
   * Internal Services
   */
  const pg = new PgService(pool);

  /**
   * Middlewares
   */
  const withDb = pgMiddleware({ db: pg });
  const withCommsApi = passThroughMiddleware({ commsApi: axios.create({ baseURL: env.EMAIL_API }) });
  const withLogger = requestLoggingMiddleware(logger);

  /**
   * Services
   */
  const services = [
    new HttpService({
      listener: withLogger(withDb(withCommsApi(await httpListener()))),
      port: Number(env.PORT),
      hostname: env.HOST,
    }),
    new KafkaConsumerService(kafka, schemaRegistry, {
      topics: [env.TOPIC],
      groupId: env.GROUP_ID,
      fromBeginning: true,
      eachMessage: withDb(feedbackConsumer),
    }),
  ];

  return { initOrder: [pg, services], logger };
};
// application
