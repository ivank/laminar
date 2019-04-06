import { RequestListener } from 'http';
import { Readable } from 'stream';
import { toArray } from './helpers';
import { HttpError } from './HttpError';
import { request } from './request';
import { isResponse, resolveBody, response } from './response';
import { Context, Resolver } from './types';

export const laminar = (resolver: Resolver<Context>): RequestListener => {
  return async (req, res) => {
    try {
      const { url, method, headers, query, body, cookies } = await request(req);
      const context: Context = { url, method, headers, query, body, cookies };
      const result = await resolver(context);
      const laminarResponse = isResponse(result) ? result : response({ body: result });
      const resolvedBody = resolveBody(laminarResponse.body);

      for (const [header, headerValue] of Object.entries(laminarResponse.headers)) {
        for (const value of toArray(headerValue)) {
          res.setHeader(header, value);
        }
      }

      res.statusCode = laminarResponse.status;
      resolvedBody instanceof Readable ? resolvedBody.pipe(res) : res.end(resolvedBody);
    } catch (error) {
      if (error instanceof HttpError) {
        res.statusCode = error.code;
        res.end(JSON.stringify(error.body));
      } else {
        res.statusCode = 500;
        res.end(error.message);
      }
    }
  };
};
