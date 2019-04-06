import { resolveRefs } from '@ovotech/json-refs';
import { Schema, validate } from '@ovotech/json-schema';
import {
  Context,
  isResponse,
  Matcher,
  MatcherParams,
  message,
  Resolver,
  response,
  selectMatcher,
  toMatcher,
} from '@ovotech/laminar';
import { readFileSync } from 'fs';
import * as YAML from 'js-yaml';
import { OpenApi } from './schema';
import { toContextSchema } from './to-context-schema';
import { toResponseSchema } from './to-response-schema';
import { OpenAPIObject } from './types';

interface RouteMatcher<TContext extends Context> extends Matcher {
  resolver: Resolver<TContext>;
  contextSchema: Schema;
  responseSchema: Schema;
}

interface RouteContext {
  params: MatcherParams;
}

export const toMatchers = <TContext extends Context & RouteContext>(
  api: OpenAPIObject,
  resolvers: {
    [path: string]: { [method: string]: Resolver<TContext> };
  },
) =>
  Object.entries(resolvers).reduce<Array<RouteMatcher<TContext>>>(
    (paths, [path, methods]) =>
      Object.entries(methods).reduce((all, [method, resolver]) => {
        const operation = api.paths[path][method];
        return [
          ...all,
          {
            ...toMatcher(method, path),
            resolver,
            contextSchema: toContextSchema(operation),
            responseSchema: toResponseSchema(operation),
          },
        ];
      }, paths),
    [],
  );

export const oapi = async <TContext extends Context>(
  apiFile: string,
  resolvers: {
    [path: string]: { [method: string]: Resolver<TContext & RouteContext> };
  },
): Promise<Resolver<TContext>> => {
  const api: OpenAPIObject = YAML.load(String(readFileSync(apiFile)));
  const apiResult = await validate(OpenApi, api);
  if (!apiResult.valid) {
    console.log(apiResult.errors);
    throw new Error('Invalid Open API');
  }

  const matchers = toMatchers(await resolveRefs(api), resolvers);

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

    const contextResponse = await validate(contextSchema, context, { name: 'context' });

    if (!contextResponse.valid) {
      return message(400, { message: 'Request Validation Error', errors: contextResponse.errors });
    }

    const result = resolver(context);
    const laminarResponse = isResponse(result) ? result : response({ body: result });
    const responseResult = await validate(responseSchema, laminarResponse, {
      name: 'response',
    });

    if (!responseResult.valid) {
      return message(500, {
        message: 'Response Validation Error',
        errors: responseResult.errors,
      });
    }

    return laminarResponse;
  };
};
