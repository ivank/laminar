import { HttpService, router, get, jsonOk, HttpListener, run } from '@ovotech/laminar';
import axios from 'axios';
import { keycloakAuthMiddleware, createSession } from '../src';
import { generateKeyPair } from 'crypto';
import { promisify } from 'util';

describe('Integration', () => {
  it('Should process response for public / private key and keycloak', async () => {
    const { publicKey, privateKey } = await promisify(generateKeyPair)('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: 'laminar secret',
      },
    });

    const auth = keycloakAuthMiddleware({
      secret: publicKey,
      service: 'test-service',
      options: { clockTolerance: 10 },
    });

    const signOptions = {
      secret: { key: privateKey, passphrase: 'laminar secret' },
      options: { algorithm: 'RS256' as const },
    };

    const testTokenWithoutScopes = createSession(signOptions, { email: 'tester' }).jwt;

    const testTokenWithOtherServiceRoles = createSession(signOptions, {
      clientId: 'tester',
      email: 'tester',
      resource_access: { 'service-1': { roles: ['test1'] } },
    }).jwt;

    const testTokenWithServiceRolesOther = createSession(signOptions, {
      clientId: 'tester',
      email: 'tester',
      resource_access: { 'test-service': { roles: ['test2'] } },
    }).jwt;

    const testTokenWithServiceRoles = createSession(signOptions, {
      clientId: 'tester',
      email: 'tester',
      resource_access: { 'test-service': { roles: ['test1'] } },
    }).jwt;

    const listener: HttpListener = router(
      get(
        '/test',
        auth()(async ({ authInfo }) => jsonOk({ text: 'Test', ...authInfo })),
      ),
      get(
        '/test-scopes',
        auth(['test1'])(async ({ authInfo }) => jsonOk({ text: 'Test', ...authInfo })),
      ),
    );
    const http = new HttpService({ listener, port: 8063 });
    await run({ initOrder: [http] }, async () => {
      const api = axios.create({ baseURL: 'http://localhost:8063' });

      const result1 = api.get('/test', {
        headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
      });

      await expect(result1.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          message: 'Malformed jwt data - resource_access missing, probably not a keycloack jwt',
        },
      });

      const result2 = api.get('/test-scopes', {
        headers: { authorization: `Bearer ${testTokenWithOtherServiceRoles}` },
      });

      await expect(result2.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          message: 'Client tester does not have any of the required roles: [test1] for test-service',
        },
      });

      const result3 = api.get('/test-scopes', {
        headers: { authorization: `Bearer ${testTokenWithServiceRolesOther}` },
      });

      await expect(result3.catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: {
          message: 'Client tester does not have any of the required roles: [test1] for test-service',
        },
      });

      const { data: data4 } = await api.get('/test-scopes', {
        headers: { authorization: `Bearer ${testTokenWithServiceRoles}` },
      });

      expect(data4).toEqual({
        text: 'Test',
        email: 'tester',
        scopes: ['test1'],
        clientId: 'tester',
        resource_access: { 'test-service': { roles: ['test1'] } },
        iat: expect.any(Number),
      });
    });
  });
});
