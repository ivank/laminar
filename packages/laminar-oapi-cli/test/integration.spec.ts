import { HttpError, createLaminar, Laminar, response, createBodyParser } from '@ovotech/laminar';
import axios from 'axios';
import { join } from 'path';
import { createOapi } from '@ovotech/laminar-oapi';
import { LoggerContext, withLogger } from './middleware/logger';
import { Config, Pet } from './__generated__/integration';

let server: Laminar;

interface AuthInfo {
  authInfo?: {
    user?: string;
  };
}

describe('Integration', () => {
  afterEach(() => server.stop());

  it('Should process response', async () => {
    const db: Pet[] = [
      { id: 111, name: 'Catty', tag: 'kitten' },
      { id: 222, name: 'Doggy' },
    ];
    const log = jest.fn();

    const config: Config<LoggerContext & AuthInfo> = {
      api: join(__dirname, 'integration.yaml'),
      security: {
        BearerAuth: ({ headers, logger }) => {
          if (headers.authorization === 'Bearer 123') {
            logger('Auth Successful');
            return { user: 'dinkey' };
          } else {
            throw new HttpError(401, { message: 'Unathorized user' });
          }
        },
        BasicAuth: ({ headers }) => {
          if (headers.authorization !== 'Basic 123') {
            throw new HttpError(401, { message: 'Unathorized user' });
          }
        },
        ApiKeyAuth: ({ headers }) => {
          if (headers['x-api-key'] !== 'Me') {
            throw new HttpError(401, { message: 'Unathorized user' });
          }
        },
      },
      paths: {
        '/pets': {
          get: ({ logger }) => {
            logger('Get all');
            return Promise.resolve(db);
          },
          post: ({ body, authInfo, logger, headers }) => {
            const pet = { ...body, id: Math.max(...db.map(item => item.id)) + 1 };
            logger(`new pet ${pet.name}, trace token: ${headers['x-trace-token']}`);

            db.push(pet);
            return { pet, user: authInfo && authInfo.user };
          },
        },
        '/pets/{id}': {
          get: ({ path }) =>
            db.find(item => item.id === Number(path.id)) ||
            response({ status: 404, body: { code: 123, message: 'Not Found' } }),
          delete: ({ path }) => {
            const index = db.findIndex(item => item.id === Number(path.id));
            if (index !== -1) {
              db.splice(index, 1);
              return response({ status: 204 });
            } else {
              return response({ status: 404, body: { code: 12, message: 'Item not found' } });
            }
          },
        },
      },
    };

    const oapi = await createOapi(config);
    const logger = withLogger(log);
    const bodyParser = createBodyParser();

    server = createLaminar({ app: bodyParser(logger(oapi)), port: 8065 });
    await server.start();

    const api = axios.create({ baseURL: 'http://localhost:8065' });

    await expect(api.get('/unknown-url')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'Path GET /unknown-url not found' },
      }),
    );

    await expect(api.get('/pets')).resolves.toMatchObject({
      status: 200,
      data: [
        { id: 111, name: 'Catty', tag: 'kitten' },
        { id: 222, name: 'Doggy' },
      ],
    });

    await expect(api.post('/pets', { other: 'New Puppy' })).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 400,
        data: {
          errors: [
            '[context.headers] is missing [x-trace-token] keys',
            '[context.body] is missing [name] keys',
            '[context.headers] is missing [authorization] keys',
          ],
          message: 'Request Validation Error',
        },
      }),
    );

    await expect(
      api.post(
        '/pets',
        { name: 'New Puppy' },
        { headers: { Authorization: 'Bearer 000', 'X-Trace-Token': '123' } },
      ),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: { message: 'Unathorized user' },
      }),
    );

    await expect(
      api.post(
        '/pets',
        { other: 'New Puppy' },
        { headers: { Authorization: 'Bearer 123', 'X-Trace-Token': '123' } },
      ),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 400,
        data: {
          errors: ['[context.body] is missing [name] keys'],
          message: 'Request Validation Error',
        },
      }),
    );

    await expect(
      api.post(
        '/pets',
        { name: 'New Puppy' },
        { headers: { Authorization: 'Bearer 123', 'X-Trace-Token': '123' } },
      ),
    ).resolves.toMatchObject({
      status: 200,
      data: { pet: { id: 223, name: 'New Puppy' }, user: 'dinkey' },
    });

    await expect(
      api.get('/pets/111', { headers: { Authorization: 'Basic 123' } }),
    ).resolves.toMatchObject({
      status: 200,
      data: { id: 111, name: 'Catty', tag: 'kitten' },
    });

    await expect(
      api.get('/pets/000', { headers: { Authorization: 'Basic 123' } }),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: {
          code: 123,
          message: 'Not Found',
        },
      }),
    );

    await expect(
      api.get('/pets/223', { headers: { Authorization: 'Basic 123' } }),
    ).resolves.toMatchObject({
      status: 200,
      data: { id: 223, name: 'New Puppy' },
    });

    await expect(api.get('/pets')).resolves.toMatchObject({
      status: 200,
      data: [
        { id: 111, name: 'Catty', tag: 'kitten' },
        { id: 222, name: 'Doggy' },
        { id: 223, name: 'New Puppy' },
      ],
    });

    await expect(
      api.delete('/pets/228', { headers: { 'X-API-KEY': 'Me' } }),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: {
          code: 12,
          message: 'Item not found',
        },
      }),
    );

    await expect(
      api.delete('/pets/222', { headers: { 'X-API-missing': 'Me' } }),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 400,
        data: {
          errors: ['[context.headers] is missing [x-api-key] keys'],
          message: 'Request Validation Error',
        },
      }),
    );

    await expect(
      api.delete('/pets/222', { headers: { 'X-API-KEY': 'Me' } }),
    ).resolves.toMatchObject({
      status: 204,
      data: {},
    });

    await expect(api.get('/pets')).resolves.toMatchObject({
      status: 200,
      data: [
        { id: 111, name: 'Catty', tag: 'kitten' },
        { id: 223, name: 'New Puppy' },
      ],
    });

    expect(log).toHaveBeenNthCalledWith(1, 'Get all');
    expect(log).toHaveBeenNthCalledWith(2, 'Auth Successful');
    expect(log).toHaveBeenNthCalledWith(3, 'new pet New Puppy, trace token: 123');
    expect(log).toHaveBeenNthCalledWith(4, 'Get all');
    expect(log).toHaveBeenNthCalledWith(5, 'Get all');
  });
});
