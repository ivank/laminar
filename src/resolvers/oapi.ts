import * as contentType from 'content-type';
import { IncomingMessage } from 'http';
import { ValidationError, Validator } from 'jsonschema';
import * as mime from 'mime-types';
import {
  ContentObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
} from 'openapi3-ts';
import { validate } from 'swagger-parser';
import { concatStream } from '../helpers/concatStream';
import { isMatchingType } from '../helpers/matchMediaType';
import { Matcher, MatcherParams, selectMatcher, toMatcher } from '../helpers/route';
import { message } from '../response';
import { Context, Resolver } from '../types';

interface RouteMatcher<TContext extends Context> extends Matcher {
  operation: OperationObject;
  resolver: Resolver<TContext>;
}

interface RouteContext {
  params: MatcherParams;
  body: {};
}

type PathMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';

export const getParameterValue = (param: ParameterObject, ctx: Context & RouteContext) => {
  switch (param.in) {
    case 'path':
      return ctx.params[param.name];
    case 'header':
      return ctx.headers[param.name];
    case 'query':
      return ctx.query[param.name];
    case 'cookie':
      return ctx.cookies![param.name];
  }
};

export const parseBody = async (request: IncomingMessage) => {
  const requestType = contentType.parse(request.headers['content-type'] || 'text/plain').type;
  const type = mime.extension(requestType);
  const body = await concatStream(request);

  switch (type) {
    case 'json':
      return JSON.parse(body);
    default:
      return body;
  }
};

export const validateParameter = (validator: Validator, param: ParameterObject, value: any) => {
  if (!value && param.required) {
    return [new ValidationError(`Parameter ${param.name} in ${param.in} required`)];
  }
  return value && param.schema
    ? validator.validate(value, param.schema, { propertyName: `${param.in}.${param.name}` }).errors
    : [];
};

export const validateRequestBody = async (
  validator: Validator,
  requestBody: RequestBodyObject,
  request: IncomingMessage,
) => {
  const requestType = contentType.parse(request.headers['content-type'] || 'text/plain').type;
  const mediaType = selectContent(requestType, requestBody.content);

  if (mediaType) {
    if (mediaType.schema) {
      const body = await parseBody(request);
      return validator.validate(body, mediaType.schema, { propertyName: 'request' }).errors;
    } else {
      return [];
    }
  } else if (requestBody.required) {
    return [new ValidationError(`Request required, but type was ${requestType}`)];
  } else {
    return [];
  }
};

export const selectContent = (requestType: string, content: ContentObject) => {
  const key = Object.keys(content).find(type => isMatchingType(requestType, type));
  return key ? content[key] : undefined;
};

export const validateContext = async (
  parameters: ParameterObject[] | undefined,
  requestBody: RequestBodyObject | undefined,
  ctx: Context & RouteContext,
) => {
  const validator = new Validator();
  const parameterErrors = parameters
    ? parameters.reduce<ValidationError[]>(
        (all, param) => [
          ...all,
          ...validateParameter(validator, param, getParameterValue(param, ctx)),
        ],
        [],
      )
    : [];
  const bodyErrors = requestBody
    ? await validateRequestBody(validator, requestBody, ctx.request)
    : [];
  return [...parameterErrors, ...bodyErrors];
};

export const oapi = async <TContext extends Context>(
  apiSpec: string,
  resolvers: {
    [path: string]: { [method in PathMethod]?: Resolver<TContext & RouteContext> };
  },
): Promise<Resolver<TContext>> => {
  const api: OpenAPIObject = await validate(apiSpec);
  const matchers: Array<RouteMatcher<TContext & RouteContext>> = [];

  for (const [path, methods] of Object.entries(resolvers)) {
    for (const [method, resolver] of Object.entries(methods)) {
      if (!api.paths[path]) {
        throw new Error(`Path ${path} not available in paths`);
      }
      const operation: OperationObject = api.paths[path][method];
      if (!resolver) {
        throw new Error(`Method ${method} on path ${path} needs a resolver`);
      }
      if (!operation) {
        throw new Error(`Method ${method} on path ${path} is not defined in the schema`);
      }

      matchers.push({ ...toMatcher(method, path), resolver, operation });
    }
  }

  return async ctx => {
    const select = selectMatcher(ctx.method, ctx.path, matchers);

    if (!select) {
      return message(404, { message: `Path ${ctx.method} ${ctx.path} not found` });
    }

    const {
      matcher: { operation, resolver },
      params,
    } = select;

    const context = { ...ctx, params, body: '111' };

    const errors = await validateContext(
      operation.parameters as ParameterObject[],
      operation.requestBody as RequestBodyObject,
      context,
    );

    if (errors.length) {
      const errorMessages = errors.map(error => `${error.property}: ${error.message}`);
      return message(400, { message: 'Request Validation Error', errors: errorMessages });
    }

    return resolver(context);
  };
};
