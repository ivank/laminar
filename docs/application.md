# Application

<img src="assets/node-instance-single.png" alt="A single node, holding multiple services with different team concurrencies" width="600" height="330">

When writing a node application we often want to create a bunch of connections to various other stateful things - databases, logging servers, event sourcing services, the lot. And often enough they might have elaborate dependencies between their lifecycles. For example, we want our logging server connection to start before our databases, and to be stopped last. But if we have more than one database connection, we'd like to start them all at once, using something like `Promise.all`.

Now with TypeScript and the whole async / await this is not particularly hard to accomplish manually, But laminar tries its hand at helping out a little bit here.

Lets look at exhibit one, the `Service` interface.

> [packages/laminar/src/types.ts:(Service)](https://github.com/ovotech/laminar/tree/main/packages/laminar/src/types.ts#L7-L20)

```typescript
/**
 * A type that needs to be implemented by all laminar services.
 *
 * If a class implements it, you can put it in `initOrder` for {@link init}, {@link run}, {@link start}, {@link stop} commands
 *
 * @category application
 */
export interface Service {
  start(): Promise<this>;
  stop(): Promise<this>;
  describe(): string;
}
```

This sits at the heart of all the service classes in Laminar, and gives us a clear interface to manage the lifecycle of our apps.

Laminar has several functions that will work with classes that implement `Service` interface. Those are functions that all execute on a laminar "application". An application is something that ties all of those services together somehow.

Lets say we have a bunch of services:

> [examples/docs/src/application.ts:(Service)](https://github.com/ovotech/laminar/tree/main/examples/docs/src/application.ts#L3-L25)

```typescript
class MyService implements Service {
  constructor(private name: string) {}

  async start(): Promise<this> {
    return this;
  }
  async stop(): Promise<this> {
    return this;
  }
  describe(): string {
    return this.name;
  }
}

const db = new MyService('db');
const events = new MyService('events');
const dataCat = new MyService('data-cat');
const http = new HttpService({ listener: async () => jsonOk({ success: true }) });
```

### init

The most common function you'll want to use is `init`

> [examples/docs/src/application.ts:(init)](https://github.com/ovotech/laminar/tree/main/examples/docs/src/application.ts#L39-L41)

```typescript
await init({ initOrder: [[db, events, dataCat], http], logger: console });
```

What this does is it starts `db`, `events` and `dataCat` in parallel, and only after they've been successfully booted up, starts `http`. We're also specified the logger, which would output everything using node's console. You can use other loggers, for example winston.

Additionally it starts listening to the `SIGTERM` event and upon recieving it, would run all the service initializations in reverse, calling their respective `stop` method. In our case it will stop the http listener, and after its finished, will spin down `db`, `events` and `dataCat`.

### run

> [examples/docs/src/application.ts:(run)](https://github.com/ovotech/laminar/tree/main/examples/docs/src/application.ts#L33-L37)

```typescript
await run({ initOrder: [db, events, dataCat], logger: console }, async () => {
  console.log('Test out app');
});
```

This is used mostly for test. It will keep the application and all of its services running, while the given async function is running, and will spin everything down upon that function's completion. Imagine how you can start an application, then test it with its external interface, and finally shut down all the database connections and the like in an orderly fashion.

### start, stop

> [examples/docs/src/application.ts:(start-stop)](https://github.com/ovotech/laminar/tree/main/examples/docs/src/application.ts#L28-L31)

```typescript
await start({ initOrder: [db, events, dataCat], logger: console });
await stop({ initOrder: [db, events, dataCat], logger: console });
```

`start` and `stop` are low level methods that you can use to build your own init / run logic.

### A complex example

A more fleshed out example of several services tied together can be seen in [examples/petstore](https://github.com/ovotech/laminar/tree/main/examples/petstore)

> [examples/petstore/src/application.ts](https://github.com/ovotech/laminar/tree/main/examples/petstore/src/application.ts#L2-L24)

```typescript
import { Application, HttpService, requestLoggingMiddleware, LoggerLike } from '@ovotech/laminar';
import { pgMiddleware, PgService } from '@ovotech/laminar-pg';
import { createHttp } from './http';
import { Pool } from 'pg';
import { EnvVars } from './env';
import { petsDbMiddleware } from './middleware';

interface PetStoreApplication extends Application {
  secret: string;
  pg: PgService;
  http: HttpService;
}

export const createApplication = async (env: EnvVars, logger: LoggerLike): Promise<PetStoreApplication> => {
  /**
   * Dependencies
   */
  const pool = new Pool({ connectionString: env.PG });

  /**
   * Internal Services
   */
  const pg = new PgService(pool);

  /**
   * Middlewares
   */
  const withDb = pgMiddleware({ db: pg });
  const withLogger = requestLoggingMiddleware(logger);
  const withPetsDb = petsDbMiddleware();

  /**
   * Services
   */
  const http = new HttpService({
    listener: withLogger(withDb(withPetsDb(await createHttp(env)))),
    port: Number(env.PORT),
    hostname: env.HOST,
  });

  return { initOrder: [pg, http], secret: env.SECRET, pg, http, logger };
};
```
