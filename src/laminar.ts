import { RequestListener } from 'http';
import { Readable } from 'stream';
import { toArray } from './helpers/util';
import { request } from './request';
import { isResponse, resolveResponse, response } from './response';
import { Context, Resolver } from './types';

export const laminar = (resolver: Resolver<Context>): RequestListener => {
  return async (req, res) => {
    const context: Context = { request: await request(req) };
    const result = await resolver(context);
    const laminarResponse = isResponse(result) ? result : response({ body: result });
    const { headers, status, body } = resolveResponse(laminarResponse);

    for (const [header, headerValue] of Object.entries(headers)) {
      for (const value of toArray(headerValue)) {
        res.setHeader(header, value);
      }
    }

    res.statusCode = status;
    body instanceof Readable ? body.pipe(res) : res.end(body);
  };
};
