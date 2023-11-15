/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResolvedSchema, ResultError, Schema, FormatErrors } from '@ovotech/json-schema';
import { Empty } from '../../types';
import { oas31 } from 'openapi3-ts';
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
  securityScheme: oas31.SecuritySchemeObject;
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

// << OapiConfig
/**
 * @category http
 */
export interface OapiConfig<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  /**
   * Can be a filename, that would be loaded and parsed (json or yaml). Or it can be the an object representing OpenAPI schema directly. Typescript types would be used to validate that object, as well as using the official json schema to validate it at runtime as well.
   */
  api: (oas31.OpenAPIObject & { [key: string]: unknown }) | string;
  /**
   * Aan object closely following the oapi `paths` config, with the "method" function being the actual resolver.
   * All the validations in open api would be run before executing it.
   * Validations on the response object shape would also be run, and would result in a 500 error if it doesn't match.
   * This would mean that any clients of this api can be 100% certain they would receive objects in the specified shape.
   */
  paths: OapiPaths<TContext>;
  /**
   * An object implementing the security requirements, specified in the open api config. More on this later.
   */
  security?: OapiSecurity<TContext, TOapiAuthInfo>;
  /**
   * Define how to render HttpError responses.
   * This is a normal http listener that takes the the contexts as well as an "error" property holding the current error
   */
  error?: HttpListener<TContext & { error: HttpError }>;
  /**
   * Format json-schema errors.
   * Refering to the `formatError` property in https://github.com/ovotech/laminar/tree/main/packages/json-schema#custom-error-messages
   */
  formatErrors?: FormatErrors;
}
// OapiConfig

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
  operation: oas31.OperationObject;
  schema: ResolvedSchema;
  security?: oas31.SecurityRequirementObject[];
  listener: HttpListener<TContext & OapiContext & SecurityOk>;
}
