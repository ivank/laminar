import { Schema, Validator } from 'jsonschema';
import { OpenAPIObject, OperationObject, ParameterObject, RequestBodyObject } from 'openapi3-ts';
import { validate } from 'swagger-parser';
import { Matcher, MatcherParams, selectMatcher, toMatcher } from '../helpers/route';
import { flow, isMatchingType, noop, push, set } from '../helpers/util';
import { message } from '../response';
import { Context, Resolver } from '../types';

interface RouteMatcher<TContext extends Context> extends Matcher {
  resolver: Resolver<TContext>;
  contextSchema: (contentType: string | undefined) => (schema: Schema) => Schema;
}

interface RouteContext {
  params: MatcherParams;
}

type PathMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';

const parameterMap = {
  path: ['properties', 'params'],
  header: ['properties', 'request', 'headers'],
  query: ['properties', 'request', 'headers'],
  cookie: ['properties', 'request', 'cookies'],
};

const parameterSchema = (param: ParameterObject) =>
  flow(
    set([...parameterMap[param.in], 'properties', param.name], param.schema),
    param.required ? push([...parameterMap[param.in], 'required'], param.name) : noop,
  );

const parameterContextSchema = (parameters: ParameterObject[] | undefined) =>
  parameters ? flow(...parameters.map(param => parameterSchema(param))) : noop;

const matchingMediaTypeSchema = (contentType: string, requestBody: RequestBodyObject) => {
  const mediaType = Object.keys(requestBody.content).find(mediatype =>
    isMatchingType(contentType, mediatype),
  );
  return mediaType ? requestBody.content[mediaType].schema : undefined;
};

const requestBodySchema = (
  contentType: string | undefined,
  requestBody: RequestBodyObject | undefined,
) => {
  if (requestBody && contentType) {
    return flow(
      requestBody.required ? push(['properties', 'request', 'required'], 'body') : noop,
      set(
        ['properties', 'request', 'properties', 'body'],
        matchingMediaTypeSchema(contentType, requestBody),
      ),
    );
  } else {
    return noop;
  }
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

      const parametersSchema = parameterContextSchema(operation.parameters as
        | ParameterObject[]
        | undefined);

      const contextSchema = (contentType: string | undefined) =>
        flow(
          parametersSchema,
          requestBodySchema(contentType, operation.requestBody as RequestBodyObject | undefined),
        );

      matchers.push({ ...toMatcher(method, path), resolver, contextSchema });
    }
  }

  return async ctx => {
    const select = selectMatcher(ctx.request.method, ctx.request.url.pathname!, matchers);

    if (!select) {
      return message(404, {
        message: `Path ${ctx.request.method} ${ctx.request.url.pathname!} not found`,
      });
    }
    const validator = new Validator();
    const {
      matcher: { resolver, contextSchema },
      params,
    } = select;

    const context = { ...ctx, params };
    const contentType = ctx.request.headers['content-type'];
    const schema = contextSchema(contentType)({ type: 'object', properties: {} });
    const result = validator.validate(context, schema, { propertyName: 'context' });

    if (!result.valid) {
      const errorMessages = result.errors.map(error => `${error.property}: ${error.message}`);
      return message(400, { message: 'Request Validation Error', errors: errorMessages });
    }

    return resolver(context);
  };
};
