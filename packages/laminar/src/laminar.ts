import { createServer, RequestListener } from 'http';
import { Readable } from 'stream';
import { toArray } from './helpers';
import { HttpError } from './HttpError';
import { request } from './request';
import { resolveBody, toResponse } from './response';
import { Context, LaminarOptions, Resolver } from './types';

export const laminarRequestListener = (resolver: Resolver<Context>): RequestListener => {
  return async (req, res) => {
    try {
      const { url, method, headers, query, body, cookies } = await request(req);
      const context: Context = { url, method, headers, query, body, cookies };
      const result = await resolver(context);
      const laminarResponse = toResponse(result);
      const resolvedBody = resolveBody(laminarResponse.body);

      for (const [headerName, headerValue] of Object.entries(laminarResponse.headers)) {
        const values = toArray(headerValue).map(item => String(item));
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

export const laminar = async ({
  app,
  port = 3300,
  hostname = 'localhost',
  http = {},
}: LaminarOptions) => {
  const server = createServer(http, laminarRequestListener(await app));
  await new Promise(resolve => server.listen(port, hostname, resolve));
  return server;
};
