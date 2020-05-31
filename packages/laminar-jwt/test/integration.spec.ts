import { createLaminar, Laminar, createBodyParser, router, get, post } from '@ovotech/laminar';
import axios from 'axios';
import { join } from 'path';
import { createOapi } from '@ovotech/laminar-oapi';
import {
  createJwtSecurity,
  JWTContext,
  JWTSecurity,
  auth,
  jwkPublicKey,
  validateScopesKeycloak,
} from '../src';
import { Config } from './__generated__/integration';
import { sign } from 'jsonwebtoken';
import { generateKeyPair } from 'crypto';
import { promisify } from 'util';
import * as nock from 'nock';
import { readFileSync } from 'fs';

let server: Laminar;

describe('Integration', () => {
  afterEach(() => server.stop());

  it('Should process response for secret', async () => {
    const config: Config<JWTContext> = {
      api: join(__dirname, 'integration.yaml'),
      security: { JWTSecurity },
      paths: {
        '/session': {
          post: ({ createSession, body: { email, scopes } }) => createSession({ email, scopes }),
        },
        '/test': {
          get: ({ authInfo }) => ({ text: 'Test', ...authInfo }),
        },
        '/test-scopes': {
          get: ({ authInfo }) => ({ text: 'Test', ...authInfo }),
        },
      },
    };

    const bodyParser = createBodyParser();
    const oapi = await createOapi(config);
    const jwtMiddleware = createJwtSecurity({ secret: '123' });

    const testTokenWithoutScopes = sign({ email: 'tester' }, '123');
    const testTokenWithOtherScopes = sign({ email: 'tester', scopes: ['other'] }, '123');
    const testTokenExpires = sign({ email: 'tester' }, '123', { expiresIn: '1ms' });
    const testTokenNotBefore = sign({ email: 'tester' }, '123', { notBefore: 10000 });

    server = createLaminar({ app: bodyParser(jwtMiddleware(oapi)), port: 8064 });
    await server.start();

    const api = axios.create({ baseURL: 'http://localhost:8064' });

    const { data: token } = await api.post('/session', {
      email: 'test@example.com',
      scopes: ['test1', 'plus'],
    });

    expect(token).toEqual({
      jwt: expect.any(String),
      user: { email: 'test@example.com', scopes: ['test1', 'plus'] },
    });

    const { data: data1 } = await api.get('/test', {
      headers: { authorization: `Bearer ${token.jwt}` },
    });

    expect(data1).toEqual({
      text: 'Test',
      email: 'test@example.com',
      iat: expect.any(Number),
      scopes: ['test1', 'plus'],
    });

    const { data: data2 } = await api.get('/test', {
      headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
    });

    expect(data2).toEqual({
      text: 'Test',
      email: 'tester',
      iat: expect.any(Number),
    });

    const result3 = api.get('/test-scopes', {
      headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
    });

    await expect(result3).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          message: 'Authorization error. User does not have required scopes: [test1]',
        },
      }),
    );

    const result4 = api.get('/test-scopes', {
      headers: { authorization: `Bearer ${testTokenWithOtherScopes}` },
    });

    await expect(result4).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          message: 'Authorization error. User does not have required scopes: [test1]',
        },
      }),
    );

    const result5 = api.get('/test', {
      headers: { authorization: `Bearer ${testTokenExpires}` },
    });

    await expect(result5).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          expiredAt: expect.any(String),
          message: 'Authorization error. jwt expired',
        },
      }),
    );

    const result6 = api.get('/test', {
      headers: { authorization: `Bearer ${testTokenNotBefore}` },
    });

    await expect(result6).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          date: expect.any(String),
          message: 'Authorization error. jwt not active',
        },
      }),
    );
  });

  it('Should process response for public / private key pair and multiple options', async () => {
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

    const bodyParser = createBodyParser();

    const jwtMiddleware = createJwtSecurity({
      publicKey,
      privateKey: { key: privateKey, passphrase: 'laminar secret' },
      verifyOptions: { clockTolerance: 10 },
      signOptions: { audience: 'test audience', algorithm: 'RS256' },
    });

    const testTokenWithoutScopes = sign(
      { email: 'tester' },
      { key: privateKey, passphrase: 'laminar secret' },
      { algorithm: 'RS256' },
    );

    const testTokenWithOtherScopes = sign(
      { email: 'tester', scopes: ['other'] },
      { key: privateKey, passphrase: 'laminar secret' },
      { algorithm: 'RS256' },
    );

    const app = router<JWTContext>(
      post('/session', ({ createSession, body: { email, scopes } }) =>
        createSession({ email, scopes }),
      ),
      get(
        '/test',
        auth()(({ authInfo }) => ({ text: 'Test', ...authInfo })),
      ),
      get(
        '/test-scopes',
        auth(['test1'])(({ authInfo }) => ({ text: 'Test', ...authInfo })),
      ),
    );

    server = createLaminar({ app: bodyParser(jwtMiddleware(app)), port: 8063 });
    await server.start();

    const api = axios.create({ baseURL: 'http://localhost:8063' });

    const { data: token } = await api.post('/session', {
      email: 'test@example.com',
      scopes: ['test1', 'plus'],
    });

    expect(token).toEqual({
      jwt: expect.any(String),
      user: { email: 'test@example.com', scopes: ['test1', 'plus'] },
    });

    const { data: data1 } = await api.get('/test', {
      headers: { authorization: `Bearer ${token.jwt}` },
    });

    expect(data1).toEqual({
      text: 'Test',
      email: 'test@example.com',
      aud: 'test audience',
      iat: expect.any(Number),
      scopes: ['test1', 'plus'],
    });

    const { data: data2 } = await api.get('/test', {
      headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
    });

    expect(data2).toEqual({
      text: 'Test',
      email: 'tester',
      iat: expect.any(Number),
    });

    const result3 = api.get('/test-scopes', {
      headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
    });

    await expect(result3).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          message: 'Authorization error. User does not have required scopes: [test1]',
        },
      }),
    );

    const result4 = api.get('/test-scopes', {
      headers: { authorization: `Bearer ${testTokenWithOtherScopes}` },
    });

    await expect(result4).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          message: 'Authorization error. User does not have required scopes: [test1]',
        },
      }),
    );
  });

  it('Should process jwk urls, with caching and max age settings', async () => {
    const privateKey = readFileSync(join(__dirname, '../examples/private-key.pem'));
    const jwk = readFileSync(join(__dirname, '../examples/jwk.json'), 'utf8');
    const publicKey = jwkPublicKey({
      uri: 'http://example.com/.well-known/jwk.json',
      maxAge: 100,
      cache: true,
    });

    nock('http://example.com/').get('/.well-known/jwk.json').times(2).reply(200, JSON.parse(jwk));

    const bodyParser = createBodyParser();

    const jwtMiddleware = createJwtSecurity({
      publicKey,
      privateKey,
      signOptions: { algorithm: 'RS256', keyid: '54eb0f68-bbf5-44ae-a345-fbd56c50e1e8' },
    });

    const app = router<JWTContext>(
      post('/session', ({ createSession, body: { email, scopes } }) =>
        createSession({ email, scopes }),
      ),
      get(
        '/test',
        auth()(({ authInfo }) => ({ text: 'Test', ...authInfo })),
      ),
    );

    server = createLaminar({ app: bodyParser(jwtMiddleware(app)), port: 8065 });
    await server.start();

    const api = axios.create({ baseURL: 'http://localhost:8065' });

    const { data: token } = await api.post('/session', {
      email: 'test@example.com',
      scopes: ['test1', 'plus'],
    });

    expect(token).toEqual({
      jwt: expect.any(String),
      user: { email: 'test@example.com', scopes: ['test1', 'plus'] },
    });

    const { data: data1 } = await api.get('/test', {
      headers: { authorization: `Bearer ${token.jwt}` },
    });

    expect(data1).toEqual({
      text: 'Test',
      email: 'test@example.com',
      iat: expect.any(Number),
      scopes: ['test1', 'plus'],
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await api.get('/test', { headers: { authorization: `Bearer ${token.jwt}` } });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await api.get('/test', { headers: { authorization: `Bearer ${token.jwt}` } });
  });

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

    const bodyParser = createBodyParser();

    const jwtMiddleware = createJwtSecurity({
      publicKey,
      verifyOptions: { clockTolerance: 10 },
      validateScopes: validateScopesKeycloak('test-service'),
    });

    const testTokenWithoutScopes = sign(
      { email: 'tester' },
      { key: privateKey, passphrase: 'laminar secret' },
      { algorithm: 'RS256' },
    );

    const testTokenWithOtherServiceRoles = sign(
      { email: 'tester', resource_access: { 'service-1': { roles: ['test1'] } } },
      { key: privateKey, passphrase: 'laminar secret' },
      { algorithm: 'RS256' },
    );

    const testTokenWithServiceRolesOther = sign(
      { email: 'tester', resource_access: { 'test-service': { roles: ['test2'] } } },
      { key: privateKey, passphrase: 'laminar secret' },
      { algorithm: 'RS256' },
    );

    const testTokenWithServiceRoles = sign(
      { email: 'tester', resource_access: { 'test-service': { roles: ['test1'] } } },
      { key: privateKey, passphrase: 'laminar secret' },
      { algorithm: 'RS256' },
    );

    const app = router<JWTContext>(
      get(
        '/test',
        auth()(({ authInfo }) => ({ text: 'Test', ...authInfo })),
      ),
      get(
        '/test-scopes',
        auth(['test1'])(({ authInfo }) => ({ text: 'Test', ...authInfo })),
      ),
    );

    server = createLaminar({ app: bodyParser(jwtMiddleware(app)), port: 8063 });
    await server.start();

    const api = axios.create({ baseURL: 'http://localhost:8063' });

    const { data: data1 } = await api.get('/test', {
      headers: { authorization: `Bearer ${testTokenWithoutScopes}` },
    });

    expect(data1).toEqual({
      text: 'Test',
      email: 'tester',
      iat: expect.any(Number),
    });

    const result2 = api.get('/test-scopes', {
      headers: { authorization: `Bearer ${testTokenWithOtherServiceRoles}` },
    });

    await expect(result2).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          message:
            'Authorization error. User does not have required roles: [test1] for test-service',
        },
      }),
    );

    const result3 = api.get('/test-scopes', {
      headers: { authorization: `Bearer ${testTokenWithServiceRolesOther}` },
    });

    await expect(result3).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: {
          message:
            'Authorization error. User does not have required roles: [test1] for test-service',
        },
      }),
    );

    const { data: data4 } = await api.get('/test-scopes', {
      headers: { authorization: `Bearer ${testTokenWithServiceRoles}` },
    });

    expect(data4).toEqual({
      text: 'Test',
      email: 'tester',
      resource_access: { 'test-service': { roles: ['test1'] } },
      iat: expect.any(Number),
    });
  });
});
