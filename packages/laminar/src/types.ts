/* eslint-disable @typescript-eslint/no-explicit-any */

import { CookieSerializeOptions } from 'cookie';
import { IncomingHttpHeaders, OutgoingHttpHeaders, ServerOptions } from 'http';
import { Readable } from 'stream';
import { UrlWithParsedQuery } from 'url';

export const Laminar = '_isLaminar';

export interface LaminarOptions {
  app: Promise<Resolver<Context>> | Resolver<Context>;
  bodyParser?: Middleware<{}, Context>;
  port?: number;
  hostname?: string;
  http?: ServerOptions;
}

export interface LaminarResponse<TBody = string | Readable | Buffer | object> {
  [Laminar]: true;
  body?: TBody;
  status: number;
  cookies?: { [key: string]: string | LaminarCookie };
  headers: OutgoingHttpHeaders;
}

export interface LaminarCookie extends CookieSerializeOptions {
  value: string;
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
  url: UrlWithParsedQuery;
  method: Method;
  headers: IncomingHttpHeaders;
  query: any;
  body: any;
  cookies?: { [key: string]: string };
}

export type Middleware<
  TProvide extends object = {},
  TRequire extends object = {},
  TInherit extends object = {}
> = (next: Resolver<TProvide & TRequire & TInherit>) => Resolver<TRequire & TInherit>;

export type ResolverResponse = string | Readable | Buffer | LaminarResponse | object;

export type Resolver<TContext extends object = {}> = (
  ctx: TContext,
) => Promise<ResolverResponse> | ResolverResponse;

export type RouteMatcher<C extends object = {}> = (ctx: Context & C) => RouteContext | false;

export interface Route<C extends object = {}> {
  matcher: RouteMatcher;
  resolver: Resolver<C & RouteContext & Context>;
  [key: string]: unknown;
}

export interface RouteContext {
  path: any;
}

export type RouteResolver = <C extends object = {}>(
  path: string,
  resolver: Resolver<C & RouteContext & Context>,
) => Route<C>;

export type DefaultRouteResolver = <C extends object = {}>(
  resolver: Resolver<C & RouteContext & Context>,
) => Route<C>;
