import { HttpError, laminar, response } from '@ovotech/laminar';
import axios from 'axios';
import { Server } from 'http';
import { join } from 'path';
import { OapiConfig, createOapi } from '../src';
import { LoggerContext, withLogger } from './middleware/logger';

let server: Server;

type Pet = NewPet & {
  id: number;
  [key: string]: unknown;
};

interface NewPet {
  name: string;
  tag?: string;
  [key: string]: unknown;
}

interface PathWithId {
  id: string;
}

interface AuthInfo {
  authInfo?: {
    user?: string;
  };
}

const isBodyNewPet = (body: unknown): body is NewPet =>
  typeof body === 'object' && body !== null && 'name' in body;

const isPathWithId = (path: unknown): path is PathWithId =>
  typeof path === 'object' && path !== null && 'id' in path;

describe('Integration', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    const db: Pet[] = [{ id: 111, name: 'Catty', tag: 'kitten' }, { id: 222, name: 'Doggy' }];
    const log = jest.fn();

    const config: OapiConfig<LoggerContext & AuthInfo> = {
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
          post: ({ body, authInfo, logger }) => {
            if (!isBodyNewPet(body)) {
              throw new HttpError(400, { message: 'Wrong body' });
            }
            const pet = { ...body, id: Math.max(...db.map(item => item.id)) + 1 };
            logger(`new pet ${pet.name}`);

            db.push(pet);
            return { pet, user: authInfo && authInfo.user };
          },
        },
        '/pets/{id}': {
          get: ({ path }) => {
            if (!isPathWithId(path)) {
              throw new HttpError(400, { message: 'Missing id in path' });
            }
            if (path.id === '10000') {
              return JSON.parse(JSON.stringify({ something: 'else' }));
            }
            return (
              db.find(item => item.id === Number(path.id)) ||
              response({ status: 404, body: { code: 123, message: 'Not Found' } })
            );
          },
          delete: ({ path }) => {
            if (!isPathWithId(path)) {
              throw new HttpError(400, { message: 'Missing id in path' });
            }

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

    server = await laminar({ app: logger(oapi), port: 8063 });

    const api = axios.create({ baseURL: 'http://localhost:8063' });

    await expect(api.get('/unknown-url')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'Path GET /unknown-url not found' },
      }),
    );

    await expect(api.get('/pets')).resolves.toMatchObject({
      status: 200,
      data: [{ id: 111, name: 'Catty', tag: 'kitten' }, { id: 222, name: 'Doggy' }],
    });

    await expect(api.post('/pets', { other: 'New Puppy' })).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 400,
        data: {
          errors: [
            '[context.body] is missing [name] keys',
            '[context.headers] is missing [authorization] keys',
          ],
          message: 'Request Validation Error',
        },
      }),
    );

    await expect(
      api.post('/pets', { name: 'New Puppy' }, { headers: { Authorization: 'Bearer 000' } }),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 401,
        data: { message: 'Unathorized user' },
      }),
    );

    await expect(
      api.post('/pets', { other: 'New Puppy' }, { headers: { Authorization: 'Bearer 123' } }),
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
      api.post('/pets', { name: 'New Puppy' }, { headers: { Authorization: 'Bearer 123' } }),
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
      api.get('/pets/10000', { headers: { Authorization: 'Basic 123' } }),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 500,
        data: {
          message: 'Response Validation Error',
          errors: [
            '[response.body] is missing [name] keys',
            '[response.body] is missing [id] keys',
          ],
        },
      }),
    );

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
      data: [{ id: 111, name: 'Catty', tag: 'kitten' }, { id: 223, name: 'New Puppy' }],
    });

    expect(log).toHaveBeenNthCalledWith(1, 'Get all');
    expect(log).toHaveBeenNthCalledWith(2, 'Auth Successful');
    expect(log).toHaveBeenNthCalledWith(3, 'new pet New Puppy');
    expect(log).toHaveBeenNthCalledWith(4, 'Get all');
    expect(log).toHaveBeenNthCalledWith(5, 'Get all');
  });
});

describe('Invalid Schema', () => {
  it('Should throw an error on invalid schema', async () => {
    expect(
      createOapi({
        paths: {},
        api: join(__dirname, 'invalid-schema.yaml'),
      }),
    ).rejects.toMatchObject({
      message: 'Invalid API Definition',
      errors: [
        '[value.paths./pets.get.parameters.0] should match only 1 schema, matching 0',
        '[value.paths./pets.get.parameters.0.0?] should match only 1 schema, matching 0',
        '[value.paths./pets.get.parameters.0.0?.0?.in] should be one of [path]',
        '[value.paths./pets.get.parameters.0.0?.0?.required] should be one of [true]',
        '[value.paths./pets.get.parameters.0.0?.1?.in] should be one of [query]',
        '[value.paths./pets.get.parameters.0.0?.2?.in] should be one of [header]',
        '[value.paths./pets.get.parameters.0.0?.3?.in] should be one of [cookie]',
        '[value.paths./pets.get.parameters.0.1?] is missing [$ref] keys',
        '[value.paths./pets.get.responses] has unknown keys [wrong status]',
      ],
    });
  });

  it('Should throw an error on invalid security', async () => {
    expect(
      createOapi({
        paths: {},
        api: join(__dirname, 'invalid-security.yaml'),
      }),
    ).rejects.toMatchObject({
      message: 'Security scheme WrongAuth not defined in components.securitySchemes',
    });
  });

  it('Should throw an error if some resolvers are not implemented', async () => {
    expect(
      createOapi({
        paths: {
          '/pets': {
            get: () => '',
          },
        },
        security: {
          BasicAuth: () => ({}),
        },
        api: join(__dirname, 'integration.yaml'),
      }),
    ).rejects.toMatchObject({
      message: 'Invalid Resolvers',
      errors: [
        '[api.paths./pets] is missing [post] keys',
        '[api.paths] is missing [/pets/{id}] keys',
        '[api.security] is missing [BearerAuth, ApiKeyAuth] keys',
      ],
    });
  });
});
