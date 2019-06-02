import { HttpError, laminar, response } from '@ovotech/laminar';
import axios from 'axios';
import { createServer, Server } from 'http';
import { join } from 'path';
import { loadYamlFile, oapi, OapiPaths, OapiSecurityResolvers } from '../src';

let server: Server;

export type Pet = NewPet & {
  id: number;
  [key: string]: any;
};

export interface NewPet {
  name: string;
  tag?: string;
  [key: string]: any;
}

describe('Integration', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    const db: Pet[] = [{ id: 111, name: 'Catty', tag: 'kitten' }, { id: 222, name: 'Doggy' }];

    const securityResolvers: OapiSecurityResolvers = {
      BearerAuth: ({ context }) => {
        if (context.headers.authorization === 'Bearer 123') {
          return { user: 'dinkey' };
        } else {
          throw new HttpError(401, { message: 'Unathorized user' });
        }
      },
      BasicAuth: ({ context }) => {
        if (context.headers.authorization !== 'Basic 123') {
          throw new HttpError(401, { message: 'Unathorized user' });
        }
      },
      ApiKeyAuth: ({ context }) => {
        if (context.headers['x-api-key'] !== 'Me') {
          throw new HttpError(401, { message: 'Unathorized user' });
        }
      },
    };

    const paths: OapiPaths = {
      '/pets': {
        get: () => db,
        post: ({ body, security }: { body: NewPet; security?: any }) => {
          const pet = { ...body, id: Math.max(...db.map(item => item.id)) + 1 };
          db.push(pet);
          return { pet, user: security.user };
        },
      },
      '/pets/{id}': {
        get: ({ path }: { path: { id: string } }) =>
          db.find(item => item.id === Number(path.id)) ||
          response({ status: 404, body: { code: 123, message: 'Not Found' } }),
        delete: ({ path }: { path: { id: string } }) => {
          const index = db.findIndex(item => item.id === Number(path.id));
          if (index !== -1) {
            db.splice(index, 1);
            return response({ status: 204 });
          } else {
            return response({ status: 404, body: { code: 12, message: 'Item not found' } });
          }
        },
      },
    };

    const app = await oapi({
      paths,
      securityResolvers,
      api: loadYamlFile(join(__dirname, 'integration.yaml')),
    });

    server = createServer(laminar(app));

    await new Promise(resolve => server.listen(8093, resolve));
    const api = axios.create({ baseURL: 'http://localhost:8093' });

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
  });
});
