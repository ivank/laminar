import * as http from 'http';
import * as https from 'https';
import { Readable } from 'stream';
import { toArray } from './helpers';
import { HttpError } from './HttpError';
import { resolveBody, toResponse } from './response';
import {
  Context,
  Resolver,
  Laminar,
  LaminarOptionsHttp,
  LaminarOptionsHttps,
  LaminarOptions,
} from './types';
import { toContext } from './context';

export const laminarRequestListener = (resolver: Resolver<Context>): http.RequestListener => {
  return async (req, res) => {
    try {
      const ctx = await toContext(req);
      const result = await resolver(ctx);
      const laminarResponse = toResponse(result);
      const resolvedBody = resolveBody(laminarResponse.body);

      for (const [headerName, headerValue] of Object.entries(laminarResponse.headers)) {
        const values = toArray(headerValue).map((item) => String(item));
        if (values.length) {
          res.setHeader(headerName.toLowerCase(), values);
        }
      }

      res.statusCode = laminarResponse.status;
      resolvedBody instanceof Readable ? resolvedBody.pipe(res) : res.end(resolvedBody);
    } catch (error) {
      res.setHeader('content-type', 'application/json');

      if (error instanceof HttpError) {
        res.statusCode = error.code;
        res.end(JSON.stringify(error.body));
      } else {
        res.statusCode = 500;
        res.end(JSON.stringify({ message: error.message }));
      }
    }
  };
};

export function createLaminar(options: LaminarOptionsHttp): Laminar<http.Server>;
export function createLaminar(options: LaminarOptionsHttps): Laminar<https.Server>;
export function createLaminar(options: LaminarOptions): Laminar {
  const { app, port = 3300, hostname = 'localhost' } = options;
  const requestListener = laminarRequestListener(app);
  const server =
    'https' in options
      ? https.createServer(options.https, requestListener)
      : http.createServer(typeof options.http === 'object' ? options.http : {}, requestListener);

  return {
    server,
    start: () => new Promise((resolve) => server.listen(port, hostname, resolve)),
    stop: () =>
      new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

export const describeLaminar = (laminar: Laminar): string => {
  const address = laminar.server.address();
  const url =
    typeof address === 'object' && address
      ? `${address.address}:${address.port} (${address.family})`
      : address;

  return ` ⛲ Laminar: ${laminar.server.listening ? 'Running' : 'Stopped'}, Address: ${url}`;
};
