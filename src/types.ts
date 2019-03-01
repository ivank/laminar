import { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders } from 'http';
import { ParsedUrlQuery } from 'querystring';
import { Readable } from 'stream';

export const laminarKey = Symbol('Laminar Response');

export interface Response {
  body: string | Readable | Buffer | object | undefined;
  type: string;
  status: number;
  cookies: { [key: string]: string } | undefined;
  headers: OutgoingHttpHeaders;
}

export enum Method {
  GET = 'GET',
  POST = 'POST',
  HEAD = 'HEAD',
  PUT = 'PUT',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  TRACE = 'TRACE',
  PATCH = 'PATCH',
}

export interface Context {
  method: Method;
  path: string;
  query: ParsedUrlQuery;
  headers: IncomingHttpHeaders;
  cookies?: { [key: string]: string };
  request: IncomingMessage;
}

export type Middleware<TAddition extends {} = {}> = <TContext extends Context = Context>(
  resolver: Resolver<TContext & TAddition>,
) => Resolver<TContext>;
export type ResolverResponse = string | Readable | Buffer | Response | object;
export type Resolver<TContext extends Context = Context> = (
  ctx: TContext,
) => Promise<ResolverResponse> | ResolverResponse;
