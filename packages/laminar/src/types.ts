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

export interface LaminarResponse<TBody = string | Readable | Buffer | object> {
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

export interface Context {
  url: UrlWithParsedQuery;
  method: Method;
  headers: any;
  query: any;
  body: any;
  cookies?: { [key: string]: string };
}

export type Middleware<TProvide extends object = {}, TRequire extends object = {}> = <
  TInherit extends Context = Context
>(
  next: Resolver<TProvide & TRequire & TInherit>,
) => Resolver<TRequire & TInherit>;

export type ResolverResponse = string | Readable | Buffer | LaminarResponse | object;

export type Resolver<TContext extends object = {}> = (
  ctx: TContext,
) => Promise<ResolverResponse> | ResolverResponse;

export type RouteMatcher<C extends object = {}> = (ctx: Context & C) => RouteContext | false;

export interface Route<C extends object = {}> {
  matcher: RouteMatcher;
  resolver: RouteResolver<C>;
  [key: string]: unknown;
}

export interface RouteContext {
  path: any;
}

export type RouteResolver<C extends object = {}> = Resolver<C & RouteContext & Context>;

export type RouteHelper = <C extends object = {}>(
  path: string,
  resolver: Resolver<C & RouteContext & Context>,
) => Route<C>;

export type DefaultRouteHelper = <C extends object = {}>(
  resolver: Resolver<C & RouteContext & Context>,
) => Route<C>;
