import { laminar, response } from '@ovotech/laminar';
import { loadYamlFile, oapi } from '@ovotech/laminar-oapi';
import axios from 'axios';
import { createServer, Server } from 'http';
import { join } from 'path';

import { LaminarPaths, Pet } from './__generated__/integration';

let server: Server;

describe('Integration', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    const db: Pet[] = [{ id: 111, name: 'Catty', tag: 'kitten' }, { id: 222, name: 'Doggy' }];

    const paths: LaminarPaths = {
      '/pets': {
        get: () => db,
        post: ({ body }) => {
          const pet = { ...body, id: Math.max(...db.map(item => item.id)) + 1 };
          db.push(pet);
          return pet;
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
    };

    const app = await oapi({ paths, api: loadYamlFile(join(__dirname, 'integration.yaml')) });
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
          errors: ['[context.body] is missing [name] keys'],
          message: 'Request Validation Error',
        },
      }),
    );

    await expect(api.post('/pets', { name: 'New Puppy' })).resolves.toMatchObject({
      status: 200,
      data: { id: 223, name: 'New Puppy' },
    });

    await expect(api.get('/pets/111')).resolves.toMatchObject({
      status: 200,
      data: { id: 111, name: 'Catty', tag: 'kitten' },
    });

    await expect(api.get('/pets/000')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: {
          code: 123,
          message: 'Not Found',
        },
      }),
    );

    await expect(api.get('/pets/223')).resolves.toMatchObject({
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

    await expect(api.delete('/pets/228')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: {
          code: 12,
          message: 'Item not found',
        },
      }),
    );

    await expect(api.delete('/pets/222')).resolves.toMatchObject({
      status: 204,
      data: {},
    });

    await expect(api.get('/pets')).resolves.toMatchObject({
      status: 200,
      data: [{ id: 111, name: 'Catty', tag: 'kitten' }, { id: 223, name: 'New Puppy' }],
    });
  });
});
