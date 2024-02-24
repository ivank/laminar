import { compile, withinContext, ensureValid, Schema, ResolvedSchema, toSchemaObject } from '@laminarjs/json-schema';
import { openapiV3 } from 'openapi-schemas';
import { OapiConfig } from './types';
import { Empty } from '../../types';
import { oas31 } from 'openapi3-ts';

/**
 * Resolve $ref schemas by using context resolved schema
 */
export function resolveRef<T extends oas31.ISpecificationExtension>(
  schema: ResolvedSchema,
  item: T | oas31.ReferenceObject,
): T;
export function resolveRef<T extends oas31.ISpecificationExtension>(
  schema: ResolvedSchema,
  item?: T | oas31.ReferenceObject,
): T | undefined;
export function resolveRef<T extends oas31.ISpecificationExtension>(
  schema: ResolvedSchema,
  item?: T | oas31.ReferenceObject,
): T | undefined {
  return item === undefined ? undefined : oas31.isReferenceObject(item) ? (schema.refs[item.$ref] as T) : item;
}

/**
 * Compile an OpenApi file, loading all the referenced schemas.
 * Validate against the official OpenApi schema to make sure the api is valid.
 *
 * Additionally ensure that all the paths resolvers and security resolvers are present for all paths
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 *
 * @category http
 */
export async function compileOapi<TRequest extends Empty>({
  api,
  paths,
  security,
}: OapiConfig<TRequest>): Promise<ResolvedSchema<oas31.OpenAPIObject & { [key: string]: unknown }>> {
  const compiledApi = await compile(api);
  const apiSchema = toSchemaObject(compiledApi);

  const { value: oapi } = await ensureValid<oas31.OpenAPIObject & { [key: string]: unknown }>({
    schema: openapiV3 as Schema,
    value: apiSchema,
    name: 'OpenApi',
  });

  const schema = {
    required: ['paths', ...(oapi.components?.securitySchemes ? ['security'] : [])],
    properties: {
      paths: {
        required: Object.keys(oapi?.paths ?? []),
        properties: Object.entries<oas31.PathItemObject | oas31.ReferenceObject>(oapi?.paths ?? []).reduce(
          (all, [path, pathParameters]) => {
            const { parameters, summary, description, ...methods } = resolveRef(compiledApi, pathParameters);
            return { ...all, [path]: { required: Object.keys(methods) } };
          },
          {},
        ),
      },
      ...(oapi.components?.securitySchemes
        ? { security: { required: Object.keys(oapi.components.securitySchemes) } }
        : {}),
    },
  };

  ensureValid({ schema: withinContext(schema, compiledApi), name: 'createOapiOptions', value: { paths, security } });

  return withinContext(oapi, compiledApi);
}
