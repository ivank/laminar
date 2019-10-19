import { laminar, createBodyParser } from '@ovotech/laminar';
import axios from 'axios';
import { Server } from 'http';
import { join } from 'path';
import { createOapi } from '@ovotech/laminar-oapi';
import { createJwtSecurity, JWTContext, JWTSecurity } from '../src';
import { Config } from './__generated__/integration';
import { sign } from 'jsonwebtoken';

let server: Server;

describe('Integration', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
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
    const jwtMiddleware = createJwtSecurity('123');

    const testTokenWithoutScopes = sign({ email: 'tester' }, '123');
    const testTokenWithOtherScopes = sign({ email: 'tester', scopes: ['other'] }, '123');
    const testTokenExpires = sign({ email: 'tester' }, '123', { expiresIn: '1ms' });
    const testTokenNotBefore = sign({ email: 'tester' }, '123', { notBefore: 10000 });

    server = await laminar({ app: bodyParser(jwtMiddleware(oapi)), port: 8062 });

    const api = axios.create({ baseURL: 'http://localhost:8062' });

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
});
