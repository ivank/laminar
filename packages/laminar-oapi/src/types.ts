/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from '@ovotech/json-schema';
import { Empty, AppRequest, App, Response } from '@ovotech/laminar';
import { ResolvedOperationObject } from './resolved-openapi-object';
import { OpenAPIObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';

export interface OapiPath {
  [key: string]: string;
}

export type OapiAuthInfo = any;

export interface SecurityOk<T extends OapiAuthInfo = OapiAuthInfo> {
  authInfo: T;
}

export type Security<T extends OapiAuthInfo = OapiAuthInfo> = SecurityOk<T> | Response;

export interface RequestSecurityResolver {
  scopes?: string[];
  securityScheme: SecuritySchemeObject;
}

export type OapiSecurityResolver<
  T extends Empty = Empty,
  TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo
> = (
  req: T & AppRequest & RequestOapi & RequestSecurityResolver,
) => Security<TOapiAuthInfo> | Response | Promise<Security<TOapiAuthInfo> | Response>;

export interface OapiSecurity<
  T extends Empty = Empty,
  TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo
> {
  [key: string]: OapiSecurityResolver<T, TOapiAuthInfo>;
}

export interface RequestOapi {
  path: any;
  headers: any;
  cookies: any;
  query: any;
}

export type AppRouteOapi<T extends Empty = Empty> = App<T & RequestOapi & SecurityOk>;

export interface ResponseOapi<Content, Status, Type> {
  body: Content;
  status: Status;
  headers: { 'content-type': Type } & Response['headers'];
}

export interface OapiPaths<T extends Empty> {
  [path: string]: { [method: string]: AppRouteOapi<T> };
}

export interface OapiConfig<
  T extends Empty = Empty,
  TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo
> {
  api: OpenAPIObject | string;
  paths: OapiPaths<T>;
  security?: OapiSecurity<T, TOapiAuthInfo>;
}

export type Matcher = (req: AppRequest) => OapiPath | false;

export interface Route<T extends Empty> {
  matcher: Matcher;
  request: Schema;
  response: Schema;
  operation: ResolvedOperationObject;
  security?: SecurityRequirementObject[];
  resolver: App<T & RequestOapi & SecurityOk>;
}
