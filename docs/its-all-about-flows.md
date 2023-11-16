# It's all about flows

<img src="assets/middlewares.png" alt="An image illustrating how middlewares work" width="861" height="271">

Why "Laminar"? From phisics (well wikipedia really) laminar flow is characterized by fluid particles following smooth paths in layers with each layer moving smoothly past the adjacent layers with little or no mixing.

I wanted to create a way to write rest apis in node using the full power of TypeScript so you can know at compile time if anything is wrong.

This will take a couple of steps to explain properly, but I promise it'll be worth it.

Lets see the simplest possible app with laminar, a very simple echo app

> [packages/laminar/examples/echo.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo.ts)

```typescript
import { HttpService, response, init } from '@laminarjs/laminar';

const http = new HttpService({ listener: async ({ body }) => response({ body }) });

init({ initOrder: [http], logger: console });
```

It consists of a function that gets the body of the request from the current request context, and returns it as a response. Echo.
No paths, routes or other complications.

Pretty simple, but what if we wanted to add some authentication? This is usually done by having extra code run just before the response processing, to determine if we should execute it or not. Basic stuff I know but bear with me.

Lets just assume that if Authorization header is `Me` then it's me and its fine, otherwise it must be someone else.
We can go ahead and write a middleware, that would do stuff just before passing stuff to the next middleware.

> [packages/laminar/examples/echo-auth.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo-auth.ts)

```typescript
import { HttpService, textForbidden, textOk, HttpListener, HttpMiddleware, init } from '@laminarjs/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const app: HttpListener = async (req) => textOk(req.url.toString());

const http = new HttpService({ listener: auth(app) });

init({ initOrder: [http], logger: console });
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to do stuff before and after whatever follows. For example say we wanted to log what the request and response was.

> [packages/laminar/examples/echo-auth-log.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo-auth-log.ts)

```typescript
import { HttpMiddleware, HttpListener, textForbidden, textOk, HttpService, init } from '@laminarjs/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: HttpListener = async (req) => textOk(req.body);

const http = new HttpService({ listener: log(auth(app)) });

init({ initOrder: [http], logger: console });
```

You can see how we can string those middlewares along `log(auth(app))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

A simple example would be access to an external resource, say a database. We want a middleware that creates a connection, passes that connection to all the middlewares downstream that would make use of it like checking users. But we'd like to be sure that middleware has actually executed, so we don't accidentally try to access a connection that's not there.

Lets see how we can go about doing that.

> [packages/laminar/examples/echo-auth-log-db.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo-auth-log-db.ts)

```typescript
import { HttpMiddleware, HttpListener, textForbidden, jsonOk, HttpService, init } from '@laminarjs/laminar';

/**
 * Its a very simple database, that only has one function:
 * Return the user that is valid, e.g. Me
 */
interface DB {
  getValidUser: () => string;
}

interface DBContext {
  db: DB;
}

/**
 * Since any database would need to create a connection first,
 * We'll need to have a "middleware creator" function that executes
 * and returns the actual middleware
 */
const createDbMiddleware = (): HttpMiddleware<DBContext> => {
  const db: DB = { getValidUser: () => 'Me' };
  return (next) => (req) => next({ ...req, db });
};

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

/**
 * We can now require this app to have the middleware.
 * If the propper ones are not executed later, TypeScript will inform us at compile time.
 */
const app: HttpListener<DBContext> = async (req) => jsonOk({ url: req.url.toString(), user: req.db.getValidUser() });

const db = createDbMiddleware();

const http = new HttpService({ listener: log(db(auth(app))) });

init({ initOrder: [http], logger: console });
```

We have a convenience type `HttpMiddleware<TProvide, TRequre>` that state what context does it provide to all the middleware downstream of it, and what context does it require from the one upstream of it.

This allows you to be absolutely sure that the middlewares are executed, and in the right order. If you try to play around with them - you'll see that if for example you put db after auth or remove it altogether, then it won't compile at all.

So its a flow of context down the middlewares, but since its an ordered flow, we call it "laminar".

That `log(db(auth(app)))` bit is your whole application and it is just converting the request context (body, headers, path, etc) to the appropriate response. A laminar http server is nothing more than:

```typescript
import { createServer } from 'http';

const resolver = log(db(auth(app)));

createServer(async (request, response) => {
  const result = await resolver(request);
  response.statusCode = result.status;
  response.end(result.body);
});
```

## Middleware, AbstractMiddleware

There are a bunch of types around middlewares that would be useful to build your own

With `Middleware` you can create a "function agnostic" middleware that can be used for kafka / pgboss / http listener equally. This means that when implementing it, you don't have access to anything, except what you put into it. This is useful for things like database connections, which will the same regardless of what function uses it.

`HttpMiddleware`, `EachMessageMiddleware`, `EeachBatchMiddleware` and `WorkerMiddleware` are function specific. They are for building middlewares that will be used only on their repsective function types. But in return they give you access to the underlying data, specific for each of them individually.

`AbstractMiddleware` is used to build function specific middleware types. In fact all of the above are implemented using it. If you are building a new service worker type, this can be useful.
