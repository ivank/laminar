import { toHttpRequest } from './request';
import { HttpListener, IncomingMessageResolver } from './types';
import { errorsMiddleware, HttpErrorHandler } from './middleware/errors.middleware';
import { responseParserMiddleware, ResponseParser } from './middleware/response-parser.middleware';
import { bodyParserMiddleware, BodyParser } from './middleware/body-parser.middleware';
import http from 'http';
import https from 'https';
import { toArray } from '../helpers';
import { Readable } from 'stream';
import { Service } from '../types';
import { Socket } from 'net';

/**
 * Options supplied when creating the laminar application with {@link http.Server} (or {@link https.Server}).
 * Would be passed down to the appropriate components.
 *
 * @category http
 */
export interface IncomingMessageResolverParams {
  /**
   * Convert a response body into a string / buffer / readable stream
   *
   * Default parsers:
   *
   *  - json
   *  - url encoded
   *
   * Each parser would be checked in turn, calling the match function with contentType as argument
   * If it returns true, would call the parse function on it
   *
   * If no parser is matched, would call String() on the response body
   */
  responseParsers?: ResponseParser[];

  /**
   * Parse incoming request body
   *
   * Default parsers:
   *
   *  - json
   *  - url encoded
   *  - text
   */
  bodyParsers?: BodyParser[];

  /**
   * Global error handler
   */
  errorHandler?: HttpErrorHandler;

  listener: HttpListener;
}

/**
 * Combine all the components into a single middleware, and allow passing options to individual component
 *
 * @category http
 */
export function toIncomingMessageResolver({
  responseParsers,
  bodyParsers,
  errorHandler,
  listener,
}: IncomingMessageResolverParams): IncomingMessageResolver {
  const parseBody = bodyParserMiddleware(bodyParsers);
  const parseResponse = responseParserMiddleware(responseParsers);
  const handleErrors = errorsMiddleware(errorHandler);
  const resolver = parseResponse(handleErrors(parseBody(listener)));

  return async function (incomingMessage) {
    return resolver(toHttpRequest(incomingMessage));
  };
}

/**
 * Create a request listener to be used for [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
 *
 * A {@link HttpListener} would convert an incomingRequest to a {@link HttpResponse} object.
 * This function would also use the parameters of the {@link HttpResponse} to set the statusCode, headers and body in the Request Listener
 * Multiple headers are supported. If the response body is a [Readable Stream](https://nodejs.org/api/stream.html#stream_readable_streams) it would stream it as a response directly
 *
 * @category http
 */
export function toRequestListener(resolver: IncomingMessageResolver): http.RequestListener {
  return async function (incomingMessage, serverResponse) {
    const response = await resolver(incomingMessage);

    let contentTypeValue = '';
    let dispositionValue = '';

    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      const parsedHeaderName = String(headerName).toLowerCase();
      const parsedHeaderValue = String(headerValue);

      if (parsedHeaderName === 'content-type') contentTypeValue = String(parsedHeaderValue);
      if (parsedHeaderName === 'content-disposition') dispositionValue = String(parsedHeaderValue);

      const values = toArray(headerValue).map((item) => String(item));
      if (values.length) {
        serverResponse.setHeader(parsedHeaderName, values);
      }
    }

    if (dispositionValue.startsWith('attachment; filename=') && !contentTypeValue.startsWith('multipart')) {
      serverResponse.setHeader('content-disposition', dispositionValue);
    }

    serverResponse.statusCode = response.status;

    response.body instanceof Readable ? response.body.pipe(serverResponse) : serverResponse.end(response.body);
  };
}

/**
 * @category http
 */
export interface HttpParams {
  /**
   * Node http server timeout setting, set using setTimeout()
   *
   * https://nodejs.org/api/http.html#http_server_settimeout_msecs_callback
   */
  timeout?: number;

  /**
   * Port number, defaults to 3300
   */
  port?: number;

  /**
   * Hostname, defaults to localhost
   */
  hostname?: string;

  /**
   * The name of the service, appears when describe is called.
   * Default: ⛲ Laminar
   */
  name?: string;
}

/**
 * @category http
 */
export interface HttpServiceParams extends IncomingMessageResolverParams, HttpParams {
  /**
   * Options passed directly to [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
   */
  http?: http.ServerOptions;
}

/**
 * @category http
 */
export interface HttpsServiceParams extends IncomingMessageResolverParams, HttpParams {
  /**
   * Options passed directly to [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
   */
  https: https.ServerOptions;
}

/**
 * An http server that implements {@link Service} interface so it can be started / stopped by laminar.
 * Uses [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener) or [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
 *
 * @category http
 */
export class HttpService implements Service {
  public port: number;
  public hostname?: string;
  public name?: string;
  public server: https.Server | http.Server;
  public sockets = new Set<Socket>();

  constructor(public params: HttpServiceParams | HttpsServiceParams) {
    this.port = params.port ?? (process.env.LAMINAR_HTTP_PORT ? Number(process.env.LAMINAR_HTTP_PORT) : 3300);
    this.hostname = params.hostname ?? process.env.LAMINAR_HTTP_HOST;
    this.name = params.name ?? '⛲ Laminar';

    const requestListener = toRequestListener(toIncomingMessageResolver(params));

    this.server =
      'https' in params
        ? https.createServer(params.https, requestListener)
        : http.createServer(params.http ?? {}, requestListener);

    this.server.on('connection', (socket) => {
      socket.on('close', () => this.sockets.delete(socket));
      this.sockets.add(socket);
    });

    if (params.timeout !== undefined) {
      this.server.setTimeout(params.timeout);
    }
  }

  start(): Promise<this> {
    return new Promise((resolve) => this.server.listen(this.port, this.hostname, () => resolve(this)));
  }

  async stop(): Promise<this> {
    await Promise.all([
      new Promise((resolve, reject) => this.server.close((err) => (err ? reject(err) : resolve(true)))),
      new Promise((resolve) => {
        if (this.sockets.size === 0) {
          resolve(true);
        } else {
          for (const socket of this.sockets) {
            socket.on('close', () => {
              this.sockets.delete(socket);
              if (this.sockets.size === 0) {
                setTimeout(() => resolve(true));
              }
            });
            socket.destroy();
          }
        }
      }),
    ]);

    return this;
  }

  url(): string {
    return `${'https' in this.params ? 'https' : 'http'}://${this.hostname ?? '0.0.0.0'}:${this.port}`;
  }

  describe(): string {
    return `${this.name}: ${this.url() ?? '-'}`;
  }
}
