import * as http from 'http';
import * as https from 'https';
import { Readable } from 'stream';
import { toArray } from './helpers';
import { App, appComponents, AppOptions } from './components/components';
import { Resolver } from './types';

/**
 * Creeate a request listner to be used for [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
 *
 * A {@link Resolver} would convert an incomingRequest to a {@link Response} object.
 * This function would also use the parameters of the {@link Response} to set the statusCode, headers and body in the Request Listener
 * Multiple headers are supported. If the response body is a [Readable Stream](https://nodejs.org/api/stream.html#stream_readable_streams) it would stream it as a response directly
 */
export function requestListener(resolver: Resolver): http.RequestListener {
  return async (incommingMessage, serverResponse) => {
    const response = await resolver({ incommingMessage });

    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      const values = toArray(headerValue).map((item) => String(item));
      if (values.length) {
        serverResponse.setHeader(headerName.toLowerCase(), values);
      }
    }

    serverResponse.statusCode = response.status;

    response.body instanceof Readable
      ? response.body.pipe(serverResponse)
      : serverResponse.end(response.body);
  };
}

export interface OptionsBase {
  /**
   * The main application. Should be a pure function that converts an {@link AppRequest} to a {@link Response} object.
   */
  app: App;

  /**
   * Configure default components - body parsers, response parsers and error handlers
   */
  options?: AppOptions;

  /**
   * Port number, defaults to 3300
   */
  port?: number;

  /**
   * Hostname, defaults to localhost
   */
  hostname?: string;
}

export interface OptionsHttp extends OptionsBase {
  serverOptions?: http.ServerOptions;
}

export interface OptionsHttps extends OptionsBase {
  serverOptions: https.ServerOptions;
}

export interface HttpServer<TServer = http.Server | https.Server> {
  /**
   * Port number, defaults to 3300
   */
  port: number;

  /**
   * Hostname, defaults to localhost
   */
  hostname: string;
  server: TServer;
}

/**
 * Create an http server (Using [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener))
 * It is not yet listeing to that port though, you need to call {@link start} on it, and {@link stop} to stop
 */
export function httpsServer({
  port = 3300,
  hostname = 'localhost',
  serverOptions = {},
  options,
  app,
}: OptionsHttps): HttpServer<https.Server> {
  const server = https.createServer(serverOptions, requestListener(appComponents(options)(app)));
  return { server, port, hostname };
}

/**
 * Create an https server (Using [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
 * It is not yet listeing to that port though, you need to call {@link start} on it, and {@link stop} to stop
 */
export function httpServer({
  port = 3300,
  hostname = 'localhost',
  serverOptions = {},
  options,
  app,
}: OptionsHttp): HttpServer<http.Server> {
  const server = http.createServer(serverOptions, requestListener(appComponents(options)(app)));
  return { server, port, hostname };
}

/**
 * Start the http server created with {@link httpServer} or {@link httpsServer}, uses Promises
 */
export function start({ server, port, hostname }: HttpServer): Promise<void> {
  return new Promise((resolve) => server.listen(port, hostname, resolve));
}

/**
 * Stop the http server created with {@link httpServer} or {@link httpsServer}, and started with {@link start}, uses Promises
 */
export function stop({ server }: HttpServer): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

/**
 * Discribe an http server, created with created with {@link httpServer} or {@link httpsServer}
 * Would report if the server is running or not
 */
export function describe(laminar: HttpServer): string {
  const address = laminar.server.address();
  const url =
    typeof address === 'object' && address
      ? `${address.address}:${address.port} (${address.family})`
      : address;

  return ` ⛲ Laminar: ${laminar.server.listening ? 'Running' : 'Stopped'}, Address: ${url}`;
}
