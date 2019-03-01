import * as cookie from 'cookie';
import { RequestListener } from 'http';
import { Readable } from 'stream';
import { parse } from 'url';
import { LaminarResponse, resolveResponse } from './response';
import { Context, Method, Resolver } from './types';

export const laminar = (resolver: Resolver<Context>): RequestListener => {
  return async (request, response) => {
    const url = parse(request.url!, true)!;

    const context: Context = {
      request,
      headers: request.headers,
      cookies: request.headers.cookie ? cookie.parse(request.headers.cookie) : undefined,
      path: url.pathname!,
      query: url.query,
      method: request.method as Method,
    };

    const res = await resolver(context);
    const laminarResponse =
      res instanceof LaminarResponse ? res : new LaminarResponse({ body: res });
    const { headers, status, body } = resolveResponse(laminarResponse);

    for (const [header, headerValue] of Object.entries(headers)) {
      const values = Array.isArray(headerValue) ? headerValue : headerValue ? [headerValue] : [];
      for (const value of values) {
        response.setHeader(header, value);
      }
    }

    response.statusCode = status;
    body instanceof Readable ? body.pipe(response) : response.end(body);
  };
};
