import { HttpListener, jsonOk, yamlOk, LoggerContext } from '@laminarjs/laminar';
import { PgContext } from '@laminarjs/pg';
import { QueueContext } from '@laminarjs/pgboss';
import { jwtSecurityResolver } from '@laminarjs/jwt';
import { join } from 'path';
import { openApiTyped } from '../../__generated__/schema';
import { EnvVars } from '../../env';
import { hydrationMeterReadsRoute } from './hydration-meter-reads.route';
import { meterReadsRoute } from './meter-reads.route';
import { readFileSync } from 'fs';

export type HttpListenerContext = PgContext & LoggerContext & QueueContext;

export const httpListener = async (env: EnvVars): Promise<HttpListener<HttpListenerContext>> => {
  const schemaFilename = join(__dirname, '../../../schema.yaml');
  const app = await openApiTyped<HttpListenerContext>({
    api: schemaFilename,
    security: {
      BearerAuth: jwtSecurityResolver({ secret: env.SECRET }),
    },
    paths: {
      '/.well-known/health-check': {
        get: async () => jsonOk({ healthy: true }),
      },
      '/.well-known/openapi.yaml': {
        get: async () => yamlOk(readFileSync(schemaFilename, 'utf-8')),
      },
      '/v1/hydration/meter-reads': {
        post: hydrationMeterReadsRoute,
      },
      '/v1/meter-reads': {
        get: meterReadsRoute,
      },
    },
  });

  return app;
};
