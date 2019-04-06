// Typed interfaces for OpenAPI 3.0.0-RC
// see https://github.com/OAI/OpenAPI-Specification/blob/3.0.0-rc0/versions/3.0.md

export interface SpecificationExtension {
  [extensionName: string]: any;
}

export interface OpenAPIObject extends SpecificationExtension {
  openapi: string;
  info: InfoObject;
  servers?: ServerObject[];
  paths: PathsObject;
  components?: ComponentsObject;
  security?: SecurityRequirementObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}
export interface InfoObject extends SpecificationExtension {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  version: string;
}
export interface ContactObject extends SpecificationExtension {
  name: string;
  url: string;
  email: string;
}
export interface LicenseObject extends SpecificationExtension {
  name: string;
  url?: string;
}
export interface ServerObject extends SpecificationExtension {
  url: string;
  description?: string;
  variables?: { [v: string]: ServerVariableObject };
}
export interface ServerVariableObject extends SpecificationExtension {
  enum?: string[] | boolean[] | number[];
  default: string | boolean | number;
  description?: string;
}
export interface ComponentsObject extends SpecificationExtension {
  schemas?: { [schema: string]: SchemaObject };
  responses?: { [response: string]: ResponseObject };
  parameters?: { [parameter: string]: ParameterObject };
  examples?: { [example: string]: ExampleObject };
  requestBodies?: { [request: string]: RequestBodyObject };
  headers?: { [heaer: string]: HeaderObject };
  securitySchemes?: { [securityScheme: string]: SecuritySchemeObject };
  links?: { [link: string]: LinkObject };
  callbacks?: { [callback: string]: CallbackObject };
}

/**
 * Rename it to Paths Object to be consistent with the spec
 * See https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#pathsObject
 */
export interface PathsObject extends SpecificationExtension {
  // [path: string]: PathItemObject;
  [path: string]: PathItemObject | any; // Hack for allowing ISpecificationExtension
}

export interface PathItemObject extends SpecificationExtension {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  servers?: ServerObject[];
  parameters?: ParameterObject[];
}
export interface OperationObject extends SpecificationExtension {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: ResponsesObject;
  callbacks?: CallbacksObject;
  deprecated?: boolean;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];
}
export interface ExternalDocumentationObject extends SpecificationExtension {
  description?: string;
  url: string;
}

/**
 * The location of a parameter.
 * Possible values are "query", "header", "path" or "cookie".
 * Specification:
 * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#parameter-locations
 */
export type ParameterLocation = 'query' | 'header' | 'path' | 'cookie';

/**
 * The style of a parameter.
 * Describes how the parameter value will be serialized.
 * (serialization is not implemented yet)
 * Specification:
 * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#style-values
 */
export type ParameterStyle =
  | 'matrix'
  | 'label'
  | 'form'
  | 'simple'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject';

export interface BaseParameterObject extends SpecificationExtension {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;

  style?: ParameterStyle; // "matrix" | "label" | "form" | "simple" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
  allowReserved?: boolean;
  schema?: SchemaObject;
  examples?: { [param: string]: ExampleObject };
  example?: any;
  content?: ContentObject;
}

export interface ParameterObject extends BaseParameterObject {
  name: string;
  in: ParameterLocation; // "query" | "header" | "path" | "cookie";
}
export interface RequestBodyObject extends SpecificationExtension {
  description?: string;
  content: ContentObject;
  required?: boolean;
}
export interface ContentObject {
  [mediatype: string]: MediaTypeObject;
}
export interface MediaTypeObject extends SpecificationExtension {
  schema?: SchemaObject;
  examples?: ExamplesObject;
  example?: any;
  encoding?: EncodingObject;
}
export interface EncodingObject extends SpecificationExtension {
  [property: string]: EncodingPropertyObject | any; // Hack for allowing ISpecificationExtension
}
export interface EncodingPropertyObject {
  contentType?: string;
  headers?: { [key: string]: HeaderObject };
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  [key: string]: any; // (any) = Hack for allowing ISpecificationExtension
}
export interface ResponsesObject extends SpecificationExtension {
  default?: ResponseObject;

  [statuscode: string]: ResponseObject | any; // (any) = Hack for allowing ISpecificationExtension
}
export interface ResponseObject extends SpecificationExtension {
  description: string;
  headers?: HeadersObject;
  content?: ContentObject;
  links?: LinksObject;
}
export interface CallbacksObject extends SpecificationExtension {
  [name: string]: CallbackObject | any; // Hack for allowing ISpecificationExtension
}
export interface CallbackObject extends SpecificationExtension {
  [name: string]: PathItemObject | any; // Hack for allowing ISpecificationExtension
}
export interface HeadersObject {
  [name: string]: HeaderObject;
}
export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
  [property: string]: any; // Hack for allowing ISpecificationExtension
}
export interface LinksObject {
  [name: string]: LinkObject | SpecificationExtension;
}
export interface LinkObject extends SpecificationExtension {
  operationRef?: string;
  operationId?: string;
  parameters?: LinkParametersObject;
  requestBody?: any | string;
  description?: string;
  server?: ServerObject;
  [property: string]: any; // Hack for allowing ISpecificationExtension
}
export interface LinkParametersObject {
  [name: string]: any | string;
}
// tslint:disable-next-line:no-empty-interface
export interface HeaderObject extends BaseParameterObject {}
export interface TagObject extends SpecificationExtension {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  [extension: string]: any; // Hack for allowing ISpecificationExtension
}
export interface ExamplesObject {
  [name: string]: ExampleObject;
}

export interface SchemaObject extends SpecificationExtension {
  nullable?: boolean;
  discriminator?: DiscriminatorObject;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XmlObject;
  externalDocs?: ExternalDocumentationObject;
  example?: any;
  examples?: any[];
  deprecated?: boolean;

  type?: string;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  not?: SchemaObject;
  items?: SchemaObject;
  properties?: { [propertyName: string]: SchemaObject };
  additionalProperties?: SchemaObject | boolean;
  description?: string;
  format?: string;
  default?: any;

  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
}

export interface SchemasObject {
  [schema: string]: SchemaObject;
}

export interface DiscriminatorObject {
  propertyName: string;
  mapping?: { [key: string]: string };
}

export interface XmlObject extends SpecificationExtension {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}
export type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';

export interface SecuritySchemeObject extends SpecificationExtension {
  type: SecuritySchemeType;
  description?: string;
  name?: string; // required only for apiKey
  in?: string; // required only for apiKey
  scheme?: string; // required only for http
  bearerFormat?: string;
  flows?: OAuthFlowsObject; // required only for oauth2
  openIdConnectUrl?: string; // required only for openIdConnect
}
export interface OAuthFlowsObject extends SpecificationExtension {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}
export interface OAuthFlowObject extends SpecificationExtension {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: ScopesObject;
}
export interface ScopesObject extends SpecificationExtension {
  [scope: string]: any; // Hack for allowing ISpecificationExtension
}
export interface SecurityRequirementObject {
  [name: string]: string[];
}
