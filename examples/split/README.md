### Example laminar app

Its been split into small files to show how it can be done.

## Environment variables

The app needs env variables set to run. It has [dotenv](https://www.npmjs.com/package/dotenv) set so you can

```shell
mv .env.dist .env
```

### Running the app

Create the postgres instance that the app uses

```shell
docker-compose up
```

Now you can start the app

```shell
yarn start
```

Or you can run the integration tests. (A runnning postgres instance is required for the tests as well)

```shell
yarn test
```
