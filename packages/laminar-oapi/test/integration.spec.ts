import {
  HttpError,
  Laminar,
  file,
  stop,
  start,
  laminar,
  response,
  jsonOk,
  jsonBadRequest,
  jsonNotFound,
} from '@ovotech/laminar';
import axios from 'axios';
import { join } from 'path';
import { OapiConfig, createOapi } from '../src';
import { LoggerContext, withLogger } from './middleware/logger';

let server: Laminar;

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
    user: string;
  };
}

const isBodyNewPet = (body: unknown): body is NewPet =>
  typeof body === 'object' && body !== null && 'name' in body;

const isPathWithId = (path: unknown): path is PathWithId =>
  typeof path === 'object' && path !== null && 'id' in path;

describe('Integration', () => {
  afterEach(() => stop(server));

  it('Should process response', async () => {
    const db: Pet[] = [
      { id: 111, name: 'Catty', tag: 'kitten' },
      { id: 222, name: 'Doggy' },
    ];
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
        '/about': { get: () => file(join(__dirname, 'about.html')) },
        '/pets': {
          get: ({ logger }) => {
            logger('Get all');
            return jsonOk(db);
          },
          post: ({ body, authInfo, logger, headers }) => {
            if (!isBodyNewPet(body)) {
              return jsonBadRequest({ message: 'Wrong body' });
            }
            const pet = { ...body, id: Math.max(...db.map((item) => item.id)) + 1 };
            logger(`new pet ${pet.name}, trace token: ${headers['x-trace-token']}`);

            db.push(pet);
            return jsonOk({ pet, user: authInfo && authInfo.user });
          },
        },
        '/pets/{id}': {
          get: ({ path }) => {
            if (!isPathWithId(path)) {
              return jsonBadRequest({ message: 'Missing id in path' });
            }
            if (path.id === '10000') {
              return jsonOk(JSON.parse(JSON.stringify({ something: 'else' })));
            }
            const item = db.find((item) => item.id === Number(path.id));
            return item ? jsonOk(item) : jsonNotFound({ code: 123, message: 'Not Found' });
          },
          delete: ({ path }) => {
            if (!isPathWithId(path)) {
              return jsonBadRequest({ message: 'Missing id in path' });
            }

            const index = db.findIndex((item) => item.id === Number(path.id));
            if (index !== -1) {
              db.splice(index, 1);
              return response({ status: 204 });
            } else {
              return jsonNotFound({ code: 12, message: 'Item not found' });
            }
          },
        },
      },
    };

    const oapi = await createOapi(config);
    const logger = withLogger(log);

    server = laminar({ app: logger(oapi), port: 8063 });
    await start(server);

    const api = axios.create({ baseURL: 'http://localhost:8063' });

    await expect(api.get('/unknown-url').catch((error) => error.response)).resolves.toMatchObject({
      status: 404,
      data: {
        message:
          'Request for "GET /unknown-url" did not match any of the paths defined in the OpenApi Schema',
      },
    });

    await expect(
      api.get('/about', { headers: { Authorization: 'Bearer 123' } }),
    ).resolves.toMatchObject({
      status: 200,
      headers: {
        'content-type': 'text/html',
      },
      data: `<html>
  <body>
    ABOUT TEXT
  </body>
</html>`,
    });

    await expect(api.get('/pets')).resolves.toMatchObject({
      status: 200,
      data: [
        { id: 111, name: 'Catty', tag: 'kitten' },
        { id: 222, name: 'Doggy' },
      ],
    });

    await expect(
      api.post('/pets', { other: 'New Puppy' }).catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: [
          '[request.headers] (required) is missing [x-trace-token] keys',
          '[request.body] (required) is missing [name] keys',
          '[request.headers] (required) is missing [authorization] keys',
        ],
        requestBody: {
          examples: {
            simple: {
              summary: 'A simple example',
              value: {
                name: 'Charlie',
                type: 'dog',
              },
            },
          },
          schema: {
            $ref: '#/components/schemas/NewPet',
          },
        },
        description: 'Creates a new pet in the store.  Duplicates are allowed',
        message: 'Request for "POST /pets" does not match OpenApi Schema',
      },
    });

    await expect(
      api
        .post('/pets', { name: 'New Puppy' }, { headers: { 'X-Trace-Token': '123' } })
        .catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: [
          '[request.headers.x-trace-token] (format) should match uuid format',
          '[request.headers] (required) is missing [authorization] keys',
        ],
        message: 'Request for "POST /pets" does not match OpenApi Schema',
      },
    });

    await expect(
      api
        .post('/pets', { name: 'New Puppy' }, { headers: { Authorization: 'Be 000' } })
        .catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: [
          '[request.headers] (required) is missing [x-trace-token] keys',
          '[request.headers.authorization] (pattern) should match /^Bearer/',
        ],
        message: 'Request for "POST /pets" does not match OpenApi Schema',
      },
    });

    await expect(
      api
        .post(
          '/pets',
          { name: 'New Puppy' },
          {
            headers: {
              Authorization: 'Bearer 000',
              'X-Trace-Token': '123e4567-e89b-12d3-a456-426655440000',
            },
          },
        )
        .catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 401,
      data: { message: 'Unathorized user' },
    });

    await expect(
      api
        .post(
          '/pets',
          { other: 'New Puppy' },
          {
            headers: {
              Authorization: 'Bearer 123',
              'X-Trace-Token': '123e4567-e89b-12d3-a456-426655440000',
            },
          },
        )
        .catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: ['[request.body] (required) is missing [name] keys'],
        message: 'Request for "POST /pets" does not match OpenApi Schema',
      },
    });

    await expect(
      api.post(
        '/pets',
        { name: 'New Puppy' },
        {
          headers: {
            Authorization: 'Bearer 123',
            'X-Trace-Token': '123e4567-e89b-12d3-a456-426655440000',
          },
        },
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
      api
        .get('/pets/10000', { headers: { Authorization: 'Basic 123' } })
        .catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 500,
      data: {
        message: 'Server response for "GET /pets/10000" does not match OpenApi Schema',
        errors: [
          '[response.body] (required) is missing [name] keys',
          '[response.body] (required) is missing [id] keys',
        ],
      },
    });

    await expect(
      api
        .get('/pets/000', { headers: { Authorization: 'Basic 123' } })
        .catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 404,
      data: {
        code: 123,
        message: 'Not Found',
      },
    });

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
      api.delete('/pets/228', { headers: { 'X-API-KEY': 'Me' } }).catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 404,
      data: {
        code: 12,
        message: 'Item not found',
      },
    });

    await expect(
      api
        .delete('/pets/222', { headers: { 'X-API-missing': 'Me' } })
        .catch((error) => error.response),
    ).resolves.toMatchObject({
      status: 400,
      data: {
        errors: ['[request.headers] (required) is missing [x-api-key] keys'],
        message: 'Request for "DELETE /pets/222" does not match OpenApi Schema',
      },
    });

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

    expect(log).toHaveBeenNthCalledWith(1, 'Auth Successful');
    expect(log).toHaveBeenNthCalledWith(2, 'Get all');
    expect(log).toHaveBeenNthCalledWith(3, 'Auth Successful');
    expect(log).toHaveBeenNthCalledWith(
      4,
      'new pet New Puppy, trace token: 123e4567-e89b-12d3-a456-426655440000',
    );
    expect(log).toHaveBeenNthCalledWith(5, 'Get all');
    expect(log).toHaveBeenNthCalledWith(6, 'Get all');
  });
});

describe('Invalid Schema', () => {
  it('Should throw an error on invalid schema', async () => {
    await expect(
      createOapi({
        paths: {},
        api: join(__dirname, 'invalid-schema.yaml'),
      }),
    ).rejects.toMatchObject({
      errors: [
        '[OpenApi.paths./pets.get.parameters.0] (oneOf) should satisfy exactly only 1 schema\n  | Schema 1:\n  |   [OpenApi.paths./pets.get.parameters.0] (oneOf) should satisfy exactly only 1 schema\n  |     | Schema 1:\n  |     |   [.in] (enum) should be one of [path]\n  |     |   [.required] (enum) should be one of [true]\n  |     | Schema 2:\n  |     |   [.in] (enum) should be one of [query]\n  |     | Schema 3:\n  |     |   [.in] (enum) should be one of [header]\n  |     | Schema 4:\n  |     |   [.in] (enum) should be one of [cookie]\n  | Schema 2:\n  |   [] (required) is missing [$ref] keys',
        '[OpenApi.paths./pets.get.responses] (additionalProperties) has unknown key wrong status',
      ],
    });
  });

  it('Should throw an error on invalid security', async () => {
    await expect(
      createOapi({
        paths: {
          '/pets': { get: () => response(), post: () => response() },
          '/pets/{id}': { get: () => response(), delete: () => response() },
        },
        api: join(__dirname, 'invalid-security.yaml'),
      }),
    ).rejects.toMatchObject({
      message:
        'Security scheme WrongAuth not defined in components.securitySchemes in the OpenApi Schema',
    });
  });

  it('Should throw an error if some resolvers are not implemented', async () => {
    await expect(
      createOapi({
        paths: {
          '/about': { get: () => response() },
          '/pets': { get: () => response() },
        },
        security: {
          BasicAuth: () => ({}),
        },
        api: join(__dirname, 'integration.yaml'),
      }),
    ).rejects.toMatchObject({
      errors: [
        '[OpenApi.paths./pets] (required) is missing [post] keys',
        '[OpenApi.paths] (required) is missing [/pets/{id}] keys',
        '[OpenApi.security] (required) is missing [BearerAuth, ApiKeyAuth] keys',
      ],
    });
  });
});
