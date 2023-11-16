import { HttpService, jsonOk, jsonNotFound, run } from '@laminar/laminar';
import axios, { AxiosError } from 'axios';
import { join } from 'path';
import { inspect } from 'util';
import { openApiTyped } from './__generated__/split';

interface User {
  id: number;
  email: string;
}

const isAxiosError = (object: unknown): object is AxiosError =>
  typeof object === 'object' && object !== null && 'response' in object;

describe('Integration', () => {
  it('Should process response', async () => {
    let db: User[] = [
      { id: 1, email: 'john@example.com' },
      { id: 2, email: 'anna@example.com' },
    ];

    const oapi = await openApiTyped({
      api: join(__dirname, 'split.yaml'),
      paths: {
        '/users': {
          get: async () => jsonOk(db),
          post: async ({ body: { email } }) => {
            const id = [...db].sort((a, b) => b.id - a.id)[0].id ?? 1;
            const user = { id: id + 1, email };
            db.push(user);
            return jsonOk(user);
          },
        },
        '/users/{id}': {
          get: async ({ path: { id } }) => {
            const user = db.find((item) => item.id === id);
            return user ? jsonOk(user) : jsonNotFound('Not Found');
          },
          delete: async ({ path: { id } }) => {
            const userIndex = db.findIndex((item) => item.id === id);
            if (userIndex === -1) {
              return jsonNotFound('Not Found');
            }
            db = db.slice(0, userIndex - 1).concat(db.slice(userIndex));
            return jsonOk('Deleted');
          },
        },
      },
    });

    const http = new HttpService({ listener: oapi, port: 8064 });

    await run({ initOrder: [http] }, async () => {
      try {
        const api = axios.create({ baseURL: 'http://localhost:8064' });

        expect(await api.get('/users')).toMatchObject({
          status: 200,
          data: [
            { id: 1, email: 'john@example.com' },
            { id: 2, email: 'anna@example.com' },
          ],
        });

        expect(await api.get('/users/2')).toMatchObject({
          status: 200,
          data: { id: 2, email: 'anna@example.com' },
        });

        expect(await api.post('/users', { email: 'tommy@example.com' })).toMatchObject({
          status: 200,
          data: { id: 3, email: 'tommy@example.com' },
        });
      } catch (error) {
        if (isAxiosError(error)) {
          console.error(inspect(error?.response?.data, { depth: 10, colors: true }));
        }
        throw error;
      }
    });
  });
});
