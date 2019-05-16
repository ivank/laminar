import { resolveRefs } from '@ovotech/json-refs';
import { Schema, validate } from '@ovotech/json-schema';
import {
  Context,
  HttpError,
  isResponse,
  Matcher,
  Resolver,
  response,
  selectMatcher,
  toMatcher,
} from '@ovotech/laminar';
import { readFileSync } from 'fs';
import * as YAML from 'js-yaml';
import { OapiResolverError } from './OapiResolverError';
import { OpenApi } from './schema';
import { toSchema } from './to-schema';
import { OpenAPIObject } from './types';

interface RouteMatcher<TResolver> extends Matcher {
  resolver: TResolver;
  schema: {
    context: Schema;
    response: Schema;
  };
}

export const toMatchers = <TResolver>(
  api: OpenAPIObject,
  paths: {
    [path: string]: { [method: string]: TResolver };
  },
) =>
  Object.entries(paths).reduce<Array<RouteMatcher<TResolver>>>(
    (allPaths, [path, methods]) =>
      Object.entries(methods).reduce(
        (all, [method, resolver]) => [
          ...all,
          {
            ...toMatcher(method, path),
            resolver,
            schema: toSchema(api, path, method),
          },
        ],
        allPaths,
      ),
    [],
  );

type LoadApi = { yamlFile: string } | { jsonFile: string } | { json: string } | { yaml: string };

export const loadApi = (api: LoadApi): OpenAPIObject => {
  if ('yamlFile' in api) {
    return YAML.load(String(readFileSync(api.yamlFile)));
  } else if ('yaml' in api) {
    return YAML.load(api.yaml);
  } else if ('jsonFile' in api) {
    return JSON.parse(String(readFileSync(api.jsonFile)));
  } else if ('json' in api) {
    return JSON.parse(String(readFileSync(api.json)));
  } else {
    throw new OapiResolverError('Cannot load api');
  }
};

export interface LaminarPaths {
  [path: string]: {
    [method: string]: Resolver<any>;
  };
}

export const oapi = async <TPaths extends LaminarPaths>(
  options: {
    paths: TPaths;
  } & LoadApi,
): Promise<Resolver<Context>> => {
  const api = loadApi(options);
  const checkApi = await validate(OpenApi, api);
  if (!checkApi.valid) {
    throw new OapiResolverError('Invalid API Definition', checkApi.errors);
  }

  const resolved = await resolveRefs(api);

  const matchers = toMatchers(resolved.schema, options.paths);

  return async ctx => {
    const select = selectMatcher(ctx.method, ctx.url.pathname!, matchers);

    if (!select) {
      throw new HttpError(404, {
        message: `Path ${ctx.method} ${ctx.url.pathname!} not found`,
      });
    }
    const {
      matcher: { resolver, schema },
      path,
    } = select;
    const context = { ...ctx, path };
    const checkContext = await validate(schema.context, context, {
      name: 'context',
      refs: resolved.refs,
    });

    if (!checkContext.valid) {
      throw new HttpError(400, {
        message: `Request Validation Error`,
        errors: checkContext.errors,
      });
    }

    const result = resolver(context);
    const laminarResponse = isResponse(result) ? result : response({ body: result });
    const checkResponse = await validate(schema.response, laminarResponse, {
      name: 'response',
      refs: resolved.refs,
    });

    if (!checkResponse.valid) {
      throw new HttpError(500, {
        message: `Response Validation Error`,
        errors: checkResponse.errors,
      });
    }

    return laminarResponse;
  };
};
