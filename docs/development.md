## Running the tests

You'll need to start a postgres instance to run the tests for some of the exmaples

```shell
docker-compose -f examples/docker-compose.yaml up
```

You can then run the tests with:

```shell
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is done by lerna automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs and the tests for the relevant package.

## License

This project is licensed under Apache 2 - see the [LICENSE](../LICENSE) file for details
