## Petstore example

This is a simple but functional example of building a petstore api.

## Environment variables

The app needs env variables set to run. It has [dotenv](https://www.npmjs.com/package/dotenv) set so you can

```shell
mv .env.dist .env
```

## Usage

You can start interacting with the service by initializing a postgres instance, using docker-compose

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
