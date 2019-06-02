import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { Readable } from 'stream';
import { UrlWithParsedQuery } from 'url';

export const Laminar = '_isLaminar';

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

export interface Addition {
  [key: string]: any;
}

export type Middleware<MC extends Addition = {}> = <C extends Addition = {}>(
  resolver: Resolver<MC & C>,
) => Resolver<C>;
export type ResolverResponse = string | Readable | Buffer | LaminarResponse | object;
export type Resolver<C extends Addition = {}> = (
  ctx: C & Context,
) => Promise<ResolverResponse> | ResolverResponse;

export interface Route<C extends Addition = {}> {
  matcher: (ctx: Context) => RouteContext | false;
  resolver: Resolver<C & RouteContext>;
  [key: string]: any;
}

export interface RouteContext {
  path: any;
}

export type RouteResolver = <C extends Addition = {}>(
  path: string,
  resolver: Resolver<C & RouteContext>,
) => Route<C>;
