import { readFileSync } from 'fs';
import * as YAML from 'js-yaml';
import {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponsesObject,
} from 'openapi3-ts';
import { resolveRefs } from '../helpers/json-refs';
import { Schema, validate } from '../helpers/json-schema';
import { Matcher, MatcherParams, selectMatcher, toMatcher } from '../helpers/route';
import { flow, getIn, isMatching, noop, push, set } from '../helpers/util';
import { isResponse, message, response } from '../response';
import { Context, Resolver } from '../types';
import { OpenApi } from './OpenApi';

interface RouteMatcher<TContext extends Context> extends Matcher {
  resolver: Resolver<TContext>;
  contextSchema: (contentType: string | undefined) => (schema: Schema) => Schema;
  responseSchema: (statuscode: string, contentType: string) => Schema;
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

const requestBodySchema = (
  contentType: string | undefined,
  requestBody: RequestBodyObject | undefined,
) => {
  if (requestBody && contentType) {
    const bodySchema = getIn(['content', isMatching(contentType), 'schema'], requestBody);
    return flow(
      requestBody.required ? push(['properties', 'request', 'required'], 'body') : noop,
      set(['properties', 'request', 'properties', 'body'], bodySchema),
    );
  } else {
    return noop;
  }
};

const matchResponseSchema = (statuscode: string, contentType: string, responses: ResponsesObject) =>
  getIn([statuscode, 'content', isMatching(contentType), 'schema'], responses) ||
  getIn(['default', 'content', isMatching(contentType), 'schema'], responses);

export const oapi = async <TContext extends Context>(
  apiSpecContent: string,
  resolvers: {
    [path: string]: { [method in PathMethod]?: Resolver<TContext & RouteContext> };
  },
): Promise<Resolver<TContext>> => {
  const api: OpenAPIObject = await resolveRefs(YAML.load(String(readFileSync(apiSpecContent)))!);
  const errors = validate(OpenApi, api);
  if (errors.length) {
    console.log(errors);
    throw new Error('Invalid Open API');
  }
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

      matchers.push({
        ...toMatcher(method, path),
        resolver,
        contextSchema: (contentType: string | undefined) =>
          flow(
            parametersSchema,
            requestBodySchema(contentType, operation.requestBody as RequestBodyObject | undefined),
          ),
        responseSchema: (statuscode: string, contentType: string) =>
          matchResponseSchema(statuscode, contentType, operation.responses),
      });
    }
  }

  return async ctx => {
    const select = selectMatcher(ctx.request.method, ctx.request.url.pathname!, matchers);

    if (!select) {
      return message(404, {
        message: `Path ${ctx.request.method} ${ctx.request.url.pathname!} not found`,
      });
    }
    const {
      matcher: { resolver, contextSchema, responseSchema },
      params,
    } = select;

    const context = { ...ctx, params };
    const contentType = ctx.request.headers['content-type'];
    const schema = contextSchema(contentType)({ type: 'object', properties: {} });
    const contextErrors = validate(schema, context);

    if (contextErrors.length) {
      return message(400, { message: 'Request Validation Error', errors: contextErrors });
    }

    const rawResponse = resolver(context);
    const laminarResponse = isResponse(rawResponse) ? rawResponse : response({ body: rawResponse });

    const responseSchema2 = responseSchema(String(laminarResponse.status), laminarResponse.headers[
      'Content-Type'
    ] as string);

    if (responseSchema2) {
      const responseErrors = validate(responseSchema2, laminarResponse.body);

      console.log(responseErrors, laminarResponse.body, responseSchema2);

      if (responseErrors.length) {
        return message(400, { message: 'Response Validation Error', errors: responseErrors });
      }
    }

    return laminarResponse;
  };
};
