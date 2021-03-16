import { Record, String, Undefined, Static, Union, Literal } from 'runtypes';

/**
 * Use Runtypes to create a validators for the env variables
 *
 * More on runtypes: https://github.com/pelotom/runtypes
 */
export const EnvVarsRecord = Record({
  // Database
  DB_CONNECTION: String,

  // Kafka
  KAFKA_BROKER: String,
  KAFKA_SCHEMA_REGISTRY: String,
  KAFKA_GROUP_ID: String,
  KAFKA_TOPIC_METER_READ: String,

  // Server
  HOST: String,
  PORT: String,
  SECRET: String,
  LOG_LEVEL: Union(Literal('error'), Literal('warn'), Literal('info'), Literal('debug'), Undefined),
});

/**
 * Use Runtypes to get the type of the valid env vars
 */
export type EnvVars = Static<typeof EnvVarsRecord>;
