/* eslint-disable @typescript-eslint/no-explicit-any */

import { CookieSerializeOptions } from 'cookie';
import * as http from 'http';
import * as https from 'https';
import { Readable } from 'stream';
import { UrlWithParsedQuery } from 'url';

export const LaminarObject = '_isLaminar';

interface LaminarOptionsBase {
  app: Resolver<Context>;
  port?: number;
  hostname?: string;
}

export interface LaminarOptionsHttp extends LaminarOptionsBase {
  http?: http.ServerOptions;
}

export interface LaminarOptionsHttps extends LaminarOptionsBase {
  https: https.ServerOptions;
}

export type LaminarOptions = LaminarOptionsHttp | LaminarOptionsHttps;

export interface Laminar<S = http.Server | https.Server> {
  server: S;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type LaminarResponseBody = string | Readable | Buffer | object;

export interface LaminarResponse<TBody = LaminarResponseBody> {
  [LaminarObject]: true;
  body?: TBody;
  status: number;
  cookies?: { [key: string]: string | LaminarCookie };
  headers: http.OutgoingHttpHeaders;
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

// eslint-disable-next-line @typescript-eslint/ban-types
export type ContextLike = object;

export interface Context extends ContextLike {
  url: UrlWithParsedQuery;
  method: Method;
  headers: any;
  query: any;
  body: any;
  cookies?: { [key: string]: string };
}

export type Middleware<
  TProvide extends ContextLike = ContextLike,
  TRequire extends ContextLike = ContextLike
> = <TInherit extends Context = Context>(
  next: Resolver<TProvide & TRequire & TInherit>,
) => Resolver<TRequire & TInherit>;

export type ResolverResponse = LaminarResponseBody | LaminarResponse;

export type Resolver<TContext extends ContextLike = ContextLike> = (
  ctx: TContext,
) => Promise<ResolverResponse> | ResolverResponse;

export type RouteMatcher<C extends ContextLike = ContextLike> = (
  ctx: Context & C,
) => RouteContext | false;

export interface Route<C extends ContextLike = ContextLike> {
  matcher: RouteMatcher;
  resolver: RouteResolver<C>;
  [key: string]: unknown;
}

export interface RouteContext {
  path: any;
}

export type RouteResolver<C extends ContextLike = ContextLike> = Resolver<
  C & RouteContext & Context
>;

export type RouteHelper = <C extends ContextLike = ContextLike>(
  path: string,
  resolver: Resolver<C & RouteContext & Context>,
) => Route<C>;

export type DefaultRouteHelper = <C extends ContextLike = ContextLike>(
  resolver: Resolver<C & RouteContext & Context>,
) => Route<C>;
