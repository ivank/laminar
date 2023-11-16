# Connecting to a database

Laminar has a ready made package for connecting to postgres db (using [node-postgres driver](https://node-postgres.com)). But its pretty easy to write your own connectors to whatever external service you need. We'll get through that later on.

Lets install postgres

```shell
yarn add pg
yarn add @laminar/pg
```

> [examples/docs/src/database.ts:(openApi)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database.ts#L10-L30)

```typescript
const app = await openApi<PgContext>({
  api: join(__dirname, '../schema/user.yaml'),
  paths: {
    '/user': {
      post: async ({ db, body }) => {
        const { rows } = await db.query('INSERT INTO db_users (name) VALUES ($1) RETURNING id, name', [body.name]);
        return jsonOk(rows[0]);
      },
    },
    '/user/{id}': {
      get: async ({ db, path }) => {
        const { rows } = await db.query('SELECT id, name FROM db_users WHERE id = $1', [path.id]);
        return rows[0] ? jsonOk(rows[0]) : jsonNotFound({ message: 'User not found' });
      },
    },
  },
});
```

Say we have this openapi service. We'll leave out the OpenApi Schema itself for bravity, but you can read it in the actual example file.

> [examples/docs/src/database.ts:(query)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database.ts#L15-L20)

```typescript
post: async ({ db, body }) => {
  const { rows } = await db.query('INSERT INTO db_users (name) VALUES ($1) RETURNING id, name', [body.name]);
  return jsonOk(rows[0]);
},
```

As you can see in the functions for each route you now have access to `db` from the context. That's because we've specified `PgContext` for `openApi`.
And we return `jsonOk` as our OpenAPI specifies that we can only return a json, and only with a status 200.

> [examples/docs/src/database.ts:(PgService)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database.ts#L33-L35)

```typescript
const pg = new PgService(new Pool({ connectionString: process.env.PG }));
```

Next we create the `PgService`. This is a class that wraps an actual [postgres Pool](https://node-postgres.com/api/pool) and manages its lifecycle. It would start / stop it when we run the application.

> [examples/docs/src/database.ts:(pgMiddleware)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database.ts#L37-L39)

```typescript
const withDb = pgMiddleware({ db: pg });
```

Using the `PgService` we create a `pgMiddleware`. Middlewares are like "glue" that will run some code before / after a function execution, allowing us to put properties to the function's context.

In this case `pgMiddleware` will get a new connection from the pool and pass it down to the context. And after the function has finished (or throws an error), it will release the connection to the pool. This will make sure any request does not accidentally share a transation with another request.

> [examples/docs/src/database.ts:(HttpService)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database.ts#L41-L43)

```typescript
const http = new HttpService({ listener: withDb(app) });
```

We are now ready to create the `HttpService` service with our `openApi` app as a listener.

> [examples/docs/src/database.ts:(init)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database.ts#L32-L46)

```typescript
const pg = new PgService(new Pool({ connectionString: process.env.PG }));

const withDb = pgMiddleware({ db: pg });

const http = new HttpService({ listener: withDb(app) });

init({ initOrder: [pg, http], logger: console });
```

Tying it all together, we call the `init` method. Now that would start all the services sequentially, using the specified `initOrder`. If you want to you can specify several services here in an array, which will start them in parallel, like `initOrder: [[pg1, pg2, pg3], http]`.

## Multiple postgres databases

What if you have multiple database serveres you want to talk to? The `@laminar/pg` can handle that, and with the correct typescript types.

> [examples/docs/src/database-multiple.ts:(openApi)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database-multiple.ts#L7-L28)

```typescript
const app = await openApi<PgContext<{ db: PgService; backup: PgService }>>({
  api: join(__dirname, '../schema/user.yaml'),
  paths: {
    '/user': {
      post: async ({ db, backup, body: { name } }) => {
        const { rows } = await db.query('INSERT INTO db_users (name) VALUES ($1) RETURNING id, name', [name]);
        await backup.query('INSERT INTO db_users2 (name) VALUES ($1) RETURNING id, name', [name]);
        return jsonOk(rows[0]);
      },
    },
    '/user/{id}': {
      get: async ({ db, backup, path }) => {
        const result = await db.query('SELECT id, name FROM db_users WHERE id = $1', [path.id]);
        const backupResult = await backup.query('SELECT id, name FROM db_users2 WHERE id = $1', [path.id]);
        const user = result.rows[0] ?? backupResult.rows[0];
        return user ? jsonOk(user) : jsonNotFound({ message: 'User not found' });
      },
    },
  },
});
```

You can define a `PgContext` which comes from multiple `PgService` objects. Which puts them with the right names into the context, and you can acceess them in your route functions.

> [examples/docs/src/database-multiple.ts:(pgMiddleware)](https://github.com/ivank/laminar/tree/main/examples/docs/src/database-multiple.ts#L32-L41)

```typescript
const pg = new PgService(new Pool({ connectionString: process.env.PG }));
const pgBackup = new PgService(new Pool({ connectionString: process.env.PG_BACKUP }));

const withDb = pgMiddleware({ db: pg, backup: pgBackup });

const http = new HttpService({ listener: withDb(app) });

init({ initOrder: [[pg, pgBackup], http], logger: console });
```

After that you can use the middleware to combine those services and actually pass it down to your `openApi` listener.
Notice that we've put the two postgres services in an array. That would mean they would be started and stopped in parallel.

## Custom database connections

> [examples/docs/src/middleware.ts:(middleware)](https://github.com/ivank/laminar/tree/main/examples/docs/src/middleware.ts#L4-L23)

```typescript
import { Middleware } from '@laminar/laminar';
import { Pool, PoolClient } from 'pg';

interface DBContext {
  db: PoolClient;
}

const pgPoolMiddleware = (pool: Pool): Middleware<DBContext> => {
  return (next) => async (ctx) => {
    const db = await pool.connect();
    try {
      return await next({ ...ctx, db });
    } finally {
      db.release();
    }
  };
};
```

Writing your own middlewares is easy, its just a bunch of functions called one inside the other. This is an example of an impelmenation of a postgres pool middleware.

You can use this to write any number of connectors. Just run your code before and/or after the `next` call.

To manage the database pool itself you could use a Laminar Service, you can read more about what they are and how they are used in [docs/application.md](application.md)
