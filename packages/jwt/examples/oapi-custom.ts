import {
  HttpService,
  init,
  openApi,
  securityRedirect,
  isSecurityOk,
  securityOk,
  textOk,
  textForbidden,
  setCookie,
  securityError,
} from '@laminar/laminar';
import { createSession, verifyToken } from '@laminar/jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const listener = await openApi({
    api: join(__dirname, 'oapi-custom.yaml'),
    security: {
      /**
       * Implement additional cookie security.
       * In an event of a failure, we'd want to redirect to an error page, instead of returning a 403 response
       */
      CookieSecurity: async ({ cookies, scopes }) => {
        const result = await verifyToken({ secret }, cookies?.auth, scopes);
        return isSecurityOk(result) ? result : securityRedirect('/unauthorized', { body: { message: 'Redirect' } });
      },
      /**
       * Cloud Scheduler would ensure that this header is never sent outside of the app engine environment,
       * so we're safe just checking for the existance of the header.
       */
      CloudSchedulerSecurity: ({ headers }) =>
        headers['x-cloudscheduler'] ? securityOk({}) : securityError({ message: 'Not Cloud Scheduler Job' }),
    },
    paths: {
      '/session': {
        post: async ({ body }) => setCookie({ auth: createSession({ secret }, body).jwt }, textOk('Cookie Set')),
      },
      '/test': {
        get: async () => textOk('OK'),
        post: async ({ authInfo }) => textOk(`OK ${authInfo.email}`),
      },
      '/unauthorized': { get: async () => textForbidden('Forbidden!') },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
