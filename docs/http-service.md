# Http Service

Lets discuss the HttpService in depth. HttpService accepts a number of options

## port

Will be passed to [HttpServer's listen method](https://nodejs.org/api/net.html#net_server_listen) as port.
By default its 3300, or the env variable LAMINAR_HTTP_PORT if it's defined.

> [examples/docs/src/http-service/port.ts:(port)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/port.ts#L5-L8)

```typescript
const withPort = new HttpService({ port: 5100, listener });
const basic = new HttpService({ listener });
```

## hostname

Will be passed to [HttpServer's listen method](https://nodejs.org/api/net.html#net_server_listen) as hostname.
By default its undefined, or the env variable LAMINAR_HTTP_HOST if it's defined.

> [examples/docs/src/http-service/hostname.ts:(hostname)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/hostname.ts#L5-L20)

```typescript
/**
 * Listen only to localhost
 */
const localhost = new HttpService({ hostname: 'localhost', listener });

/**
 * Listen only to all
 */
const internet = new HttpService({ hostname: '0.0.0.0', listener });

/**
 * Listen node's default (all)
 */
const all = new HttpService({ listener });
```

## timeout

Will be used to call node's [server.setTimeout](https://nodejs.org/api/http.html#http_server_settimeout_msecs_callback), after a server has been created.

> [examples/docs/src/http-service/timeout.ts:(timeout)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/timeout.ts#L5-L7)

```typescript
const service = new HttpService({ timeout: 120000, listener });
```

This will set the timeout to 120 seconds (2 mins) for every request.

## http

Will be passed when calling [node's http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener) as options.

> [examples/docs/src/http-service/http.ts:(http)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/http.ts#L5-L7)

```typescript
const service = new HttpService({ http: { maxHeaderSize: 256 }, listener });
```

## https

Will be passed when calling [node's https.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener) as options, to create a TLS service

> [examples/docs/src/http-service/https.ts:(https)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/https.ts#L7-L15)

```typescript
const service = new HttpService({
  https: {
    key: readFileSync(join(__dirname, '../../src/http-service/key.pem')),
    cert: readFileSync(join(__dirname, '../../src/http-service/cert.pem')),
  },
  listener,
});
```

## responseParsers

Used to convert your javascript object responses into strings, that node can then send to the client.

> [examples/docs/src/http-service/response-parsers.ts:(CustomResponseParser)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/response-parsers.ts#L5-L10)

```typescript
const myParser: ResponseParser = {
  match: (contentType) => contentType === 'application/my-special-mime',
  parse: (body) => body.join(','),
};
```

And then you can run it before the default response parsers:

> [examples/docs/src/http-service/response-parsers.ts:(responseParsers)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/response-parsers.ts#L12-L17)

```typescript
const service = new HttpService({
  responseParsers: [myParser, ...defaultResponseParsers],
  listener,
});
```

The default parsers are json and url-form. You can inspect them in the laminar source: [packages/laminar/src/http/middleware/response-parser.middleware.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/src/http/middleware/response-parser.middleware.ts)

## bodyParsers

By default Laminar parses JSON, URL-encoded form and Multipart Form, but you can add your own parser easily:

> [examples/docs/src/http-service/body-parsers.ts:(CustomBodyParser)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/body-parsers.ts#L13-L22)

```typescript
const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => {
    const csv = await concatStream(body);
    return csv?.split('\n').map((line) => line.split(','));
  },
};
```

And then you can run it before the default body parsers:

> [examples/docs/src/http-service/body-parsers.ts:(bodyParsers)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/body-parsers.ts#L24-L29)

```typescript
const service = new HttpService({
  bodyParsers: [csvParser, ...defaultBodyParsers],
  listener,
});
```

Since body parsers are getting the raw incomming message stream, you can write your own streaming parsers, that can leave the request as a stream, and allow you to process it as such in your application.

> [examples/docs/src/http-service/body-parser-streaming.ts:(CustomStreamingBodyParser)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/body-parser-streaming.ts#L15-L46)

```typescript
class SimpleCsvTransform extends Transform {
  private lastLine = '';
  constructor() {
    super({ readableObjectMode: true });
  }
  _flush(callback: TransformCallback) {
    callback(undefined, [this.lastLine.split(',')]);
  }
  _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
    const lines = (this.lastLine + String(chunk)).split('\n');
    this.lastLine = lines.pop() ?? '';
    const csv = lines.map((line) => line.split(','));
    callback(undefined, csv);
  }
}

const csvStreamingParser: BodyParser = {
  name: 'SimpleCsvParser',
  match: /text\/csv/,
  parse: async (body) => {
    const csvTransform = new SimpleCsvTransform();
    return body.pipe(csvTransform);
  },
};

const service = new HttpService({
  bodyParsers: [csvStreamingParser, ...defaultBodyParsers],
  listener,
});
```

## errorHandler

You can use it to customize the global error handler. It accepts the whole request, as well as the error object itself, so you can determine how best to return the error.

By default it will process [HttpError](https://github.com/ivank/laminar/tree/main/packages/laminar/src/http/http-error.ts) object by setting the correct status code and displaying all of its contents as a json response.

> [examples/docs/src/http-service/error-handler.ts:(errorHandler)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/error-handler.ts#L7-L21)

```typescript
const globalErrorHandler: HttpErrorHandler = async ({ url, error }) => {
  const message = error instanceof Error ? error.message : String(error);
  if (url.pathname.endsWith('html')) {
    return htmlBadRequest(`<html><body>${message}</body></html>`);
  } else {
    return jsonBadRequest({ message });
  }
};

const service = new HttpService({
  errorHandler: globalErrorHandler,
  listener,
});
```

## listener

A pure function to be used for listening to the http calls. It really is just an async function that will convert `HttpContext` into `HttpResponse`.

> [examples/docs/src/http-service/listener-simple.ts:(listener-simple)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/listener-simple.ts#L3-L9)

```typescript
const simpleListener = async (ctx: HttpContext): Promise<HttpResponse> => {
  return jsonOk({ message: ctx.body });
};

const service = new HttpService({ listener: simpleListener });
```

For convinience you can use the `HttpListener` type for that.

> [examples/docs/src/http-service/listener-http.ts:(listener-http)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/listener-http.ts#L3-L5)

```typescript
const httpListener: HttpListener = async (ctx) => jsonOk({ message: ctx.body });
```

Also `HttpListener` also accepts a generic type, that is used to add props to its context. That way you can add "demands" of your listener, for various things to exist in your context, and then fullfill them with middlewares

> [examples/docs/src/http-service/listener-current-date.ts:(listener-current-date)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service/listener-current-date.ts#L3-L15)

```typescript
interface CurrentDateContext {
  currentDate: Date;
}

const listenerCurrentDate: HttpListener<CurrentDateContext> = async (ctx) =>
  jsonOk({ message: `${ctx.currentDate} ${ctx.body}` });

const withCurrentDate = passThroughMiddleware<CurrentDateContext>({ currentDate: new Date() });

const service = new HttpService({ listener: withCurrentDate(listenerCurrentDate) });
```

In practice, you'll use [openApi](http-service-open-api.md) or [router](http-service-router.md) functions to create your httpListeners
