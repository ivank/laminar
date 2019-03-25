import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { ParsedUrlQuery } from 'querystring';
import { Readable } from 'stream';
import { UrlWithParsedQuery } from 'url';

export const Laminar = Symbol('Laminar');

export interface LaminarRequest {
  [Laminar]: true;
  url: UrlWithParsedQuery;
  method: Method;
  headers: IncomingHttpHeaders;
  query?: ParsedUrlQuery;
  body: any;
  cookies?: { [key: string]: string };
}

export interface LaminarResponse {
  [Laminar]: true;
  body: string | Readable | Buffer | object | undefined;
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
  request: LaminarRequest;
}

export type Middleware<TAddition extends {} = {}> = <TContext extends Context = Context>(
  resolver: Resolver<TContext & TAddition>,
) => Resolver<TContext>;
export type ResolverResponse = string | Readable | Buffer | LaminarResponse | object;
export type Resolver<TContext extends Context = Context> = (
  ctx: TContext,
) => Promise<ResolverResponse> | ResolverResponse;
