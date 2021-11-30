/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResolvedSchema, ResultError, Schema } from '@ovotech/json-schema';
import { Empty } from '../../types';
import { OpenAPIObject, OperationObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { HttpContext, HttpListener, HttpResponse } from '../types';
import { HttpError } from '../http-error';

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
export type Security<TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> = SecurityOk<TOapiAuthInfo> | HttpError;

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
) => Security<TOapiAuthInfo> | Promise<Security<TOapiAuthInfo>>;

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

export interface RequestErrorContext<TContext extends Empty> {
  route: Route<TContext>;
  result: ResultError;
}

/**
 * @category http
 */
export interface OapiConfig<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  api: OpenAPIObject | string;
  paths: OapiPaths<TContext>;
  security?: OapiSecurity<TContext, TOapiAuthInfo>;
  error?: HttpListener<TContext & { error: HttpError }>;
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
 * A function that will convert a request into desired types.
 * @category http
 */
export type ConvertResponse = (response: HttpResponse) => HttpResponse;

/**
 * @typeParam TContext pass the request properties that the app requires. Usually added by the middlewares
 * @category http
 */
export interface Route<TContext extends Empty> {
  matcher: Matcher;
  request: Schema;
  coerce: Coerce<TContext>;
  convertRequest: Coerce<TContext>;
  response: Schema;
  operation: OperationObject;
  schema: ResolvedSchema;
  security?: SecurityRequirementObject[];
  listener: HttpListener<TContext & OapiContext & SecurityOk>;
}
