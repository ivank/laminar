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

export interface LaminarResponse<
  TStatus = number,
  TBody = string | Readable | Buffer | object | undefined
> {
  [Laminar]: true;
  body: TBody;
  status: TStatus;
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

export interface MatcherPath {
  [key: string]: string;
}

export interface Matcher {
  method: string;
  pathRe: RegExp;
  keys: string[];
}

export interface RouteMatcher<TContext extends Context> extends Matcher {
  resolver: Resolver<TContext>;
}

export interface RouteContext {
  path: MatcherPath;
}

export type Route = <TContext extends Context>(
  path: string,
  resolver: Resolver<TContext>,
) => RouteMatcher<TContext>;
