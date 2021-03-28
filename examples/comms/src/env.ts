export interface EnvVars {
  TOPIC: string;
  KAFKA_BROKER: string;
  SCHEMA_REGISTRY: string;
  EMAIL_API: string;
  GROUP_ID: string;
  PG: string;
  HOST: string;
  PORT: string;
}

export const toEnvVars = ({
  KAFKA_BROKER,
  EMAIL_API,
  SCHEMA_REGISTRY,
  TOPIC,
  GROUP_ID,
  PG,
  HOST = 'localhost',
  PORT = '3344',
}: NodeJS.ProcessEnv): EnvVars => {
  if (TOPIC === undefined) {
    throw new Error('Need TOPIC env variable');
  }
  if (EMAIL_API === undefined) {
    throw new Error('Need EMAIL_API env variable');
  }
  if (KAFKA_BROKER === undefined) {
    throw new Error('Need KAFKA_BROKER env variable');
  }
  if (SCHEMA_REGISTRY === undefined) {
    throw new Error('Need SCHEMA_REGISTRY env variable');
  }
  if (GROUP_ID === undefined) {
    throw new Error('Need GROUP_ID env variable');
  }
  if (PG === undefined) {
    throw new Error('Need PG env variable');
  }
  return { EMAIL_API, KAFKA_BROKER, SCHEMA_REGISTRY, TOPIC, GROUP_ID, PG, HOST, PORT };
};
