# Laminar Postgres Service

Handle lifecyle of the pg connection pool.

### Usage

> [examples/simple.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-pg/examples/simple.ts)

```typescript
import { get, init, HttpService, jsonOk, router, HttpListener } from '@ovotech/laminar';
import { PgService, pgMiddleware } from '@ovotech/laminar-pg';
import { Pool } from 'pg';

const pool = new PgService(
  new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example', max: 5 }),
);
const withDb = pgMiddleware({ db: pool });

const listener: HttpListener = withDb(
  router(
    get('/test', async ({ db }) => {
      const { rows } = await db.query(`SELECT 'example' as "col"`);
      return jsonOk(rows);
    }),
  ),
);

const http = new HttpService({ listener });

// Wait for the pool to be connected, before starting the service
init({ initOrder: [pool, http], logger: console });
```

### Loading enum types

PG doesn't parse enum arrays properly, since their oids are dynamic https://github.com/brianc/node-pg-types/issues/56

`laminar-pg` can mitigate that by loading all the enum oids at runtime and setting the appropriate parsers, before the pool is set to accept requests.

> [examples/enum-arrays.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-pg/examples/enum-arrays.ts)

```typescript
import { get, init, HttpService, jsonOk, router, HttpListener } from '@ovotech/laminar';
import { PgService, pgMiddleware } from '@ovotech/laminar-pg';
import { Pool } from 'pg';

const pool = new PgService(
  new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example', max: 5 }),
  { initEnumTypeParsers: true },
);
const withDb = pgMiddleware({ db: pool });

const listener: HttpListener = withDb(
  router(
    get('/test', async ({ db }) => {
      const { rows } = await db.query(`SELECT ARRAY['Pending', 'Active']::enum_state[] as "col"`);
      return jsonOk(rows);
    }),
  ),
);

const http = new HttpService({ listener });

// Wait for the pool to be connected, before starting the service
init({ initOrder: [pool, http], logger: console });
```

## Transactions

You can use transactions to make sure related queries are linked together and don't affect the database state unless everything passes. The transaction promise is wrapped in "BEGIN" and "COMMIT" as we as call "ROLLBACK" if the promise is rejected.

> [examples/transactions.ts:(transactions)](https://github.com/ovotech/laminar/tree/main/packages/laminar-pg/examples/transactions.ts#L15-L32)

```typescript
const insertedIds = await db.transaction(async (t) => {
  const result1 = await t.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
    'transaction-test1',
  ]);

  const result2 = await t.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
    'transaction-test2',
  ]);

  return [result1.rows[0].id, result2.rows[0].id];
});

const { rows } = await db.query<{ id: number; name: string }>(
  'SELECT name, id FROM animals WHERE id = ANY($1) ORDER BY name ASC',
  [insertedIds],
);
```

## Isolation level

Transactions allow for setting isolation options for them.

> [examples/transactions-isolation-level.ts:(transactions)](https://github.com/ovotech/laminar/tree/main/packages/laminar-pg/examples/transactions-isolation-level.ts#L15-L23)

```typescript
const insertedIds = await db.transaction({ isolationLevel: 'serializable' }, async (t) => {
  const result1 = await t.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
    'transaction-test1',
  ]);

  return [result1.rows[0].id];
});
```

## Running the tests

You can run the tests with:

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is preferment by yarn automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
