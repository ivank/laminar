### Example laminar app

Its been split into small files to show how it can be done.

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
