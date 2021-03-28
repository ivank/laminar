/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from '@ovotech/json-schema';
import { Empty } from '../../types';
import { ResolvedOperationObject } from './resolved-openapi-object';
import { OpenAPIObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { HttpContext, HttpListener, HttpResponse } from '../types';

/**
 * @category http
 */
export interface OapiPath {
  [key: string]: string;
}

/**
 * The authorized user, returned by {@link OapiSecurityResolver}
 */
export type OapiAuthInfo = any;

/**
 * @category http
 */
export interface SecurityOk<TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  authInfo: TOapiAuthInfo;
}

/**
 * @category http
 */
export type Security<TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> = SecurityOk<TOapiAuthInfo> | HttpResponse;

/**
 * @category http
 */
export interface RequestSecurityResolver {
  scopes?: string[];
  securityScheme: SecuritySchemeObject;
}

/**
 * @category http
 */
export type OapiSecurityResolver<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> = (
  ctx: TContext & HttpContext & OapiContext & RequestSecurityResolver,
) => Security<TOapiAuthInfo> | HttpResponse | Promise<Security<TOapiAuthInfo> | HttpResponse>;

/**
 * Oapi Security Resolvers
 *
 * @category http
 */
export interface OapiSecurity<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  [key: string]: OapiSecurityResolver<TContext, TOapiAuthInfo>;
}

/**
 * Open API request will have those additional fields as contexts
 *
 * @category http
 */
export interface OapiContext {
  path: any;
  headers: any;
  cookies: any;
  query: any;
}

/**
 * @category http
 */
export type AppRouteOapi<TContext extends Empty = Empty> = HttpListener<TContext & OapiContext & SecurityOk>;

/**
 * @category http
 */
export interface ResponseOapi<Content, Status, Type> {
  body: Content;
  status: Status;
  headers: { 'content-type': Type } & HttpResponse['headers'];
}

/**
 * @category http
 */
export interface OapiPaths<TContext extends Empty> {
  [path: string]: { [method: string]: AppRouteOapi<TContext> };
}

/**
 * @category http
 */
export interface OapiConfig<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  api: OpenAPIObject | string;
  paths: OapiPaths<TContext>;
  security?: OapiSecurity<TContext, TOapiAuthInfo>;
  notFound?: HttpListener<TContext>;
}

/**
 * @category http
 */
export type Matcher = (ctx: HttpContext) => OapiPath | false;

/**
 * A function that will convert a request into desired types.
 * @category http
 */
export type Coerce<TContext extends Empty = Empty> = (
  ctx: TContext & HttpContext & OapiContext,
) => TContext & HttpContext & OapiContext;

/**
 * @typeParam TContext pass the request properties that the app requires. Usually added by the middlewares
 * @category http
 */
export interface Route<TContext extends Empty> {
  matcher: Matcher;
  request: Schema;
  coerce: Coerce<TContext>;
  response: Schema;
  operation: ResolvedOperationObject;
  security?: SecurityRequirementObject[];
  listener: HttpListener<TContext & OapiContext & SecurityOk>;
}
