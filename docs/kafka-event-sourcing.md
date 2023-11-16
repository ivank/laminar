# Kafka

Laminar has a built in integration with kafka, using the awesome [kafkajs](https://kafka.js.org) library. Asuming you are familiar with what kafka is and what it does (no really, go check the [intro to kafka from their docs](https://kafka.js.org/docs/introduction)), lets see how we can connect to it.

Lets look at a hypothetical comms api. It has an endpoint to initiate the comm to the user. It returns immediately, and then after the email sending is complete, will send a kafka message on a feedback topic, informing that it has been delivered.

Now we want to build an api that will talk to this service, save the state in a database, and track it using the kafka topic.

You can explore the whole solution [examples/comms](https://github.com/ivank/laminar/tree/main/examples/comms), but we'll explain everything here in detail.

## Dependencies

```shell
yarn add @kafkajs/confluent-schema-registry kafkajs pg axios
```

Those will be needed by our app to connect to kafka, postgres and the external email service

```shell
yarn add --dev @types/pg typescript
```

Next we add typescript and some types

```shell
yarn add @laminar/laminar @laminar/kafkajs @laminar/pg
```

We can now add laminar itself, along with connectors for kafkajs and pg.

```shell
yarn add --dev @laminar/cli
```

And finally we'll need the cli to generate some types for us.

## Generating types

We have the schema for what we want our service to look like, [examples/comms/comms.yaml](https://github.com/ivank/laminar/tree/main/examples/comms/comms.yaml) and we have the avro type of that kafka message - [examples/comms/avro/feedback.avsc](https://github.com/ivank/laminar/tree/main/examples/comms/avro/feedback.avsc).

Using the cli, we can start generating the types for us.

```
yarn laminar api --file comms.yaml --output src/__generated__/comms.ts
yarn laminar avro avro/* --output-dir src/__generated__
```

## Http Listener

> [examples/comms/src/http.listener.ts:(listener)](https://github.com/ivank/laminar/tree/main/examples/comms/src/http.listener.ts#L7-L33)

```typescript
export const httpListener = async (): Promise<HttpListener<PgContext & CommsApiContext>> => {
  return await openApiTyped({
    api: join(__dirname, '../comms.yaml'),

    paths: {
      '/comms': {
        post: async ({ body, db, commsApi }) => {
          const { data } = await commsApi.post('/communication', { email: body.email, template: 'test' });

          const result = await db.query(
            'INSERT INTO comms (comm_id, status) VALUES ($1, $2) RETURNING id, comm_id as "commId", status',
            [data.commId, data.status],
          );
          return jsonOk(result.rows[0]);
        },
      },
      '/comms/{id}': {
        get: async ({ path: { id }, db }) => {
          const result = await db.query('SELECT id, comm_id as "commId", status FROM comms WHERE id = $1', [id]);
          return result.rows[0] ? jsonOk(result.rows[0]) : jsonNotFound({ message: 'Comm Not Found' });
        },
      },
    },
  });
};
```

That should take care of the REST part - when we geet the comm, we hit the external email api, and save the `commId` so we can ping it later.

## Kafka Consumer

> [examples/comms/src/feedback.consumer.ts:(consumer)](https://github.com/ivank/laminar/tree/main/examples/comms/src/feedback.consumer.ts#L5-L14)

```typescript
export const feedbackConsumer: EachMessageConsumer<Feedback, Buffer, PgContext> = async ({ db, message }) => {
  if (message.decodedValue) {
    await db.query('UPDATE comms SET status = $1 WHERE comm_id = $2', [
      message.decodedValue.status,
      message.decodedValue.commId,
    ]);
  }
};
```

The kafka topic consumer itself is pretty minimal, just updates the status of the comm, given a comm id. Since this is what we'll be expecting on the feedback topic, it should be all we need to keep ourselves in sync with the external email api.

## Application

> [examples/comms/src/application.ts:(application)](https://github.com/ivank/laminar/tree/main/examples/comms/src/application.ts#L22-L62)

```typescript
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
```

And now we can create both http and kafka consumer service, with all of its dependencies. `KafkaConsumerService` will just subscribe and run a kafka consumer, you can read more about parameters and configs in [kafkajs docs](https://kafka.js.org/docs/consuming). The only difference is that eachMessage / eachBatch will hold one more property on its messages - decodedValue, as every message will be put through the schema registry before being sent to the consumer function.

## Starting

> [examples/comms/src/index.ts:(create)](https://github.com/ivank/laminar/tree/main/examples/comms/src/index.ts#L5-L9)

```typescript
createApplication(toEnvVars(process.env), console)
  .then(init)
  .catch((error) => console.error(error));
```

Starting it all up is just a matter of calling `init` on the application itself, after it is created. [toEnvVars](https://github.com/ivank/laminar/tree/main/examples/comms/src/env.ts) just validates environment variables and returns them.

## Producing Messages

> [examples/comms/tests/integration.spec.ts:(KafkaProducerService)](https://github.com/ivank/laminar/tree/main/examples/comms/tests/integration.spec.ts#L59-L63)

```typescript
const producer = new KafkaProducerService(kafka, schemaRegistry, {
  register: registerSchemas({ [`${env.TOPIC}-value`]: readAVSC(join(__dirname, '../avro/feedback.avsc')) }),
});
```

You can create a producer service, that can be used to send the kafka messages. `KafkaProducerService` will encode the messages using [schemaRegistry](https://kafkajs.github.io/confluent-schema-registry/) before sending them, but you can also access the underlying [kafkajs producer](https://kafka.js.org/docs/producing) too.

the `registerSchemas` function will register the avsc schemas for each topic in your schema registry, and save the resulting id in memory. This will mean sending kafka messages will not result in a round trip to the schema registry for every message, using the `send` method.

Of course, you can skip that pre-register and use the `sendWithSchema` which will do this ad-hoc.

> [examples/comms/tests/integration.spec.ts:(send)](https://github.com/ivank/laminar/tree/main/examples/comms/tests/integration.spec.ts#L95-L100)

```typescript
await producer.send<Feedback>({
  topic: env.TOPIC,
  messages: [{ value: { commId: `test-${uniqueTestRun}`, status: 'Delivered' }, key: uniqueTestRun }],
});
```

Sending the message is now just a call to the `send` method. It will throw an error if the topic has not been pre-registered

## Logical Types and customizing SchemaRegistry

You can read up on how to enable logical types in the [schema registry docs](https://kafkajs.github.io/confluent-schema-registry/docs/custom-types).

Have in mind that those are a bit finicky and the avsc (underlying avro library) need to match exactly.
