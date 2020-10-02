import axios, { AxiosRequestConfig } from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { spawn } from 'child_process';
import { URLSearchParams } from 'url';
import { join } from 'path';
import { CookieJar } from 'tough-cookie';

describe('Example files', () => {
  it.each<[string, AxiosRequestConfig, AxiosRequestConfig, unknown]>([
    [
      'examples/jwk.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
      },
      {
        result: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
    [
      'examples/keycloak.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: {
          email: 'test@example.com',
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
      },
      {
        result: 'ok',
        user: {
          email: 'test@example.com',
          iat: expect.any(Number),
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
    ],
    [
      'examples/keypair.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
      },
      {
        result: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
    [
      'examples/oapi-keycloak.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: {
          email: 'test@example.com',
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
      },
      {
        text: 'ok',
        user: {
          email: 'test@example.com',
          iat: expect.any(Number),
          resource_access: { 'my-service-name': { roles: ['admin'] } },
        },
      },
    ],
    [
      'examples/oapi.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
      },
      {
        text: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
    [
      'examples/oapi-api-key.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: new URLSearchParams({ email: 'test@example.com' }),
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
        data: '',
      },
      'OK test@example.com',
    ],
    [
      'examples/oapi-custom.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: new URLSearchParams({ email: 'test@example.com' }),
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
        data: '',
      },
      'OK test@example.com',
    ],
    [
      'examples/simple.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333/session',
        data: { email: 'test@example.com', scopes: ['admin'] },
      },
      {
        method: 'POST',
        url: 'http://localhost:3333/test',
      },
      {
        result: 'ok',
        user: { email: 'test@example.com', iat: expect.any(Number), scopes: ['admin'] },
      },
    ],
  ])('Should process %s', async (file, jwtRequest, testRequest, expected) => {
    const service = spawn('yarn', ['ts-node', file], {
      cwd: join(__dirname, '..'),
      detached: true,
    });
    const errorLogger = (data: Buffer): void => console.error(data.toString());
    const jar = new CookieJar();

    try {
      service.stderr.on('data', errorLogger);
      await new Promise((resolve) => {
        service.stdout.on('data', (data) =>
          String(data).includes('Laminar: Running') ? resolve() : undefined,
        );
      });
      const api = axiosCookieJarSupport(axios);
      const jwtResponse = await api.request({ ...jwtRequest, jar });

      if (typeof jwtResponse.data !== 'string') {
        expect(jwtResponse.data).toMatchObject({ jwt: expect.any(String) });
      }
      const headers = { Authorization: `Bearer ${jwtResponse.data.jwt}` };
      const { data } = await api.request({ ...testRequest, headers, withCredentials: true, jar });
      expect(data).toEqual(expected);
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      service.stderr.off('data', errorLogger);
      process.kill(-service.pid);
    }
  });
});
