## Data Loader example

This is a complex example, showing the use of various laminar services.

- [Kafka](http://kafka.js.org) with [SchemaRegistry](https://kafkajs.github.io/confluent-schema-registry/)
- [Pg](https://node-postgres.com)
- [PgBoss](https://github.com/timgit/pg-boss) backed queue

## Environment variables

The app needs env variables set to run. It has [dotenv](https://www.npmjs.com/package/dotenv) set so you can

```shell
mv .env.dist .env
```

## Usage

You can start interacting with the service by initializing a postgres instance as well as a local kafka, zookeepers and schema registry server, using docker-compose

```shell
docker-compose up
```

From then on you can interact with the service by running

```shell
yarn start
```

Or you can run the integration tests. (A runnning postgres instance is required for the tests as well)

```shell
yarn test
```
