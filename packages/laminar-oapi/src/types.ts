/* eslint-disable @typescript-eslint/ban-types */
import { Schema } from '@ovotech/json-schema';
import { Empty, AppRequest, App, Response } from '@ovotech/laminar';
import { ResolvedOperationObject } from './resolved-openapi-object';
import { OpenAPIObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';

export interface OapiPath {
  [key: string]: string;
}

export type OapiAuthInfo = any;

export interface RequestAuthInfo {
  authInfo: OapiAuthInfo;
}

export interface RequestSecurityResolver {
  scopes?: string[];
  securityScheme: SecuritySchemeObject;
}

export interface RequestOapi {
  path: any;
  headers: any;
  cookies: any;
  query: any;
}

export type AppRouteOapi<T extends Empty = Empty> = App<T & RequestOapi & RequestAuthInfo>;

export interface ResponseOapi<Content, Status, Type> {
  body: Content;
  status: Status;
  headers: { 'content-type': Type } & Response['headers'];
}

export type OapiSecurityResolver<
  T extends Empty,
  TAuthInfo = OapiAuthInfo,
  TRequest extends RequestOapi = RequestOapi
> = (
  req: T & AppRequest & TRequest & RequestSecurityResolver,
) => TAuthInfo | void | Promise<TAuthInfo | void>;

export interface OapiSecurity<T extends Empty> {
  [key: string]: OapiSecurityResolver<T>;
}

export interface OapiPaths<T extends Empty> {
  [path: string]: { [method: string]: AppRouteOapi<T> };
}

export interface OapiConfig<T extends Empty = Empty> {
  api: OpenAPIObject | string;
  paths: OapiPaths<T>;
  security?: OapiSecurity<T>;
}

export type Matcher = (req: AppRequest) => OapiPath | false;

export interface Route<T extends Empty> {
  matcher: Matcher;
  request: Schema;
  response: Schema;
  operation: ResolvedOperationObject;
  security?: SecurityRequirementObject[];
  resolver: App<T & RequestOapi & RequestAuthInfo>;
}
