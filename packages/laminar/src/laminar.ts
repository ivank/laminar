import { RequestListener } from 'http';
import { Readable } from 'stream';
import { toArray } from './helpers/util';
import { request } from './request';
import { isResponse, resolveBody, response } from './response';
import { Context, Resolver } from './types';

export const laminar = (resolver: Resolver<Context>): RequestListener => {
  return async (req, res) => {
    const context: Context = { request: await request(req) };
    const result = await resolver(context);
    const { headers, status, body } = isResponse(result) ? result : response({ body: result });
    const resolvedBody = resolveBody(body);

    for (const [header, headerValue] of Object.entries(headers)) {
      for (const value of toArray(headerValue)) {
        res.setHeader(header, value);
      }
    }

    res.statusCode = status;
    resolvedBody instanceof Readable ? resolvedBody.pipe(res) : res.end(resolvedBody);
  };
};
