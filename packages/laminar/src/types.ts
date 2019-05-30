import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { Readable } from 'stream';
import { UrlWithParsedQuery } from 'url';

export const Laminar = Symbol('Laminar');

export interface LaminarRequest {
  [Laminar]: true;
  url: UrlWithParsedQuery;
  method: Method;
  headers: IncomingHttpHeaders;
  query?: any;
  body: any;
  cookies?: { [key: string]: string };
}

export interface LaminarResponse<TBody = string | Readable | Buffer | object> {
  [Laminar]: true;
  body?: TBody;
  status: number;
  cookies?: { [key: string]: string };
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
  url: LaminarRequest['url'];
  method: LaminarRequest['method'];
  headers: LaminarRequest['headers'];
  query: LaminarRequest['query'];
  body: LaminarRequest['body'];
  cookies: LaminarRequest['cookies'];
}

export type Middleware<TAddition extends {} = {}> = <TContext extends Context = Context>(
  resolver: Resolver<TContext & TAddition>,
) => Resolver<TContext>;
export type ResolverResponse = string | Readable | Buffer | LaminarResponse | object;
export type Resolver<TContext extends Context = Context> = (
  ctx: TContext,
) => Promise<ResolverResponse> | ResolverResponse;

export interface Route<
  TContext extends Context = Context,
  TMatchedContext extends RouteContext = RouteContext
> {
  matcher: (ctx: TContext) => TMatchedContext | false;
  resolver: Resolver<TContext & TMatchedContext>;
}

export interface RouteContext {
  path: any;
}

export type RouteResolver = <TContext extends Context = Context>(
  path: string,
  resolver: Resolver<TContext>,
) => Route<TContext>;
