import {
  HttpService,
  securityError,
  jsonNotFound,
  jsonOk,
  jsonNoContent,
  securityOk,
  run,
  LoggerContext,
  loggerMiddleware,
  jsonBadRequest,
  file,
  ResponseOapi,
  LoggerLike,
} from '@laminar/laminar';
import axios, { AxiosError } from 'axios';
import { join } from 'path';
import { openApiTyped, Pet, NewPet } from './__generated__/petstore';

interface AuthInfo {
  user: string;
}

const isBodyNewPet = (body: unknown): body is NewPet => typeof body === 'object' && body !== null && 'name' in body;

const isPathWithId = (path: unknown): path is Pet => typeof path === 'object' && path !== null && 'id' in path;
const isAxiosError = (object: unknown): object is AxiosError =>
  typeof object === 'object' && object !== null && 'response' in object;

describe('Integration', () => {
  it('Should process response', async () => {
    const db: Pet[] = [
      { id: 111, name: 'Catty', tag: 'kitten' },
      { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
    ];
    const log = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const oapi = await openApiTyped<LoggerContext, AuthInfo>({
      api: join(__dirname, 'petstore.yaml'),
      security: {
        BearerAuth: ({ headers, logger }) => {
          if (headers.authorization === 'Bearer 123') {
            logger.info('Auth Successful');
            return securityOk({ user: 'dinkey' });
          } else {
            return securityError({ message: 'Unathorized user' });
          }
        },
        BasicAuth: ({ headers }) => {
          if (headers.authorization === 'Basic 123') {
            return securityOk({ user: 'dinkey' });
          } else {
            return securityError({ message: 'Unathorized user' });
          }
        },
        ApiKeyAuth: ({ headers }) => {
          if (headers['x-api-key'] === 'Me') {
            return securityOk({ user: 'dinkey' });
          } else {
            return securityError({ message: 'Unathorized user' });
          }
        },
        CookieAuth: ({ cookies, securityScheme: { name } }) =>
          name && cookies?.[name] === 'Me'
            ? securityOk({ user: 'cookie' })
            : securityError({ message: 'Forbidden user' }),
      },
      paths: {
        '/about': { get: async () => file(join(__dirname, 'about.html')) as ResponseOapi<string, 200, 'text/html'> },
        '/pets': {
          get: async ({
            logger,
            query: { ids, limit, price, isKitten, pagination, sort, afterDate, afterDateTime },
          }) => {
            logger.info('Get all');
            let pets = [...db];

            if (price !== undefined) {
              pets = pets.filter((pet) => pet.name.length > price);
            }

            if (isKitten !== undefined) {
              pets = pets.filter((pet) => (pet.tag === 'kitten') === isKitten);
            }

            if (limit !== undefined) {
              pets = pets.slice(0, limit);
            }

            if (ids !== undefined) {
              pets = pets.filter((pet) => ids.includes(pet.id));
            }

            if (afterDate !== undefined) {
              pets = pets.filter((pet) => pet.addedOn && new Date(pet.addedOn) > afterDate);
            }

            if (afterDateTime !== undefined) {
              pets = pets.filter((pet) => pet.addedOn && new Date(pet.addedOn) > afterDateTime);
            }

            pets = pets.slice(pagination.page * pagination.perPage, (pagination.page + 1) * pagination.perPage);

            if (sort.field) {
              const { field, order } = sort;
              pets = [...pets].sort((a, b) => {
                const af = a[field];
                const bf = b[field];
                return af && bf ? (order === 'ASC' ? (af > bf ? 1 : -1) : af < bf ? 1 : -1) : 0;
              });
            }

            return jsonOk(pets);
          },
          post: async ({ body, authInfo, logger, headers }) => {
            if (!isBodyNewPet(body)) {
              return jsonBadRequest({ code: 111, message: 'Wrong body' });
            }
            const pet = { ...body, id: Math.max(...db.map((item) => item.id)) + 1 };
            logger.info(`new pet ${pet.name}, trace token: ${headers['x-trace-token']}`);

            db.push(pet);
            return jsonOk({ pet, user: authInfo && authInfo.user });
          },
        },
        '/pets/{id}': {
          get: async ({ path }) => {
            if (!isPathWithId(path)) {
              return jsonBadRequest({ code: 111, message: 'Missing id in path' });
            }
            if (path.id === '10000') {
              return jsonOk(JSON.parse(JSON.stringify({ something: 'else' })));
            }
            const item = db.find((item) => item.id === Number(path.id));
            return item ? jsonOk(item) : jsonNotFound({ code: 123, message: 'Not Found' });
          },
          delete: async ({ path }) => {
            if (!isPathWithId(path)) {
              return jsonBadRequest({ code: 111, message: 'Missing id in path' });
            }

            const index = db.findIndex((item) => item.id === Number(path.id));
            if (index !== -1) {
              db.splice(index, 1);
              return jsonNoContent();
            } else {
              return jsonNotFound({ code: 12, message: 'Item not found' });
            }
          },
        },
      },
    });

    const logger = loggerMiddleware<LoggerLike>(log);

    const http = new HttpService({ listener: logger(oapi), port: 8063 });

    await run({ initOrder: [http] }, async () => {
      try {
        const api = axios.create({ baseURL: 'http://localhost:8063' });

        expect(await api.get('/pets?afterDate=2020-01-01')).toMatchObject({
          status: 200,
          data: [{ id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' }],
        });

        expect(await api.get('/pets?afterDate=3020-01-01')).toMatchObject({
          status: 200,
          data: [],
        });

        expect(await api.get('/pets?afterDateTime=2020-01-01T00:00:00.000Z')).toMatchObject({
          status: 200,
          data: [{ id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' }],
        });

        expect(await api.get('/pets?afterDateTime=3020-01-01T00:00:00.000Z')).toMatchObject({
          status: 200,
          data: [],
        });

        expect(await api.get('/pets?sort[field]=name')).toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
          ],
        });

        expect(await api.get('/pets?sort[field]=name&sort[order]=DESC')).toMatchObject({
          status: 200,
          data: [
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
            { id: 111, name: 'Catty', tag: 'kitten' },
          ],
        });

        expect(await api.get('/pets?pagination[page]=0&pagination[perPage]=1')).toMatchObject({
          status: 200,
          data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
        });

        expect(await api.get('/pets?pagination[page]=1&pagination[perPage]=1')).toMatchObject({
          status: 200,
          data: [{ id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' }],
        });

        expect(await api.get('/pets?pagination[perPage]=2')).toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
          ],
        });

        expect(await api.get('/pets?ids[0]=111')).toMatchObject({
          status: 200,
          data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
        });

        expect(await api.get('/pets?ids[]=111')).toMatchObject({
          status: 200,
          data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
        });

        expect(await api.get('/pets?ids[0]=111&ids[1]=222')).toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
          ],
        });

        expect(await api.get('/pets?ids[]=111&ids[]=222')).toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
          ],
        });

        expect(await api.get('/pets?ids=111&ids=222')).toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
          ],
        });

        await expect(api.get('/pets?ids[0]=test').catch((error) => error.response)).resolves.toMatchObject({
          status: 400,
          data: {
            message: 'Request for "GET /pets" does not match OpenApi Schema',
            errors: ['[request.query.ids.0] (type) should be of type integer'],
          },
        });

        await expect(
          api.get('/pets?pagination[page]=-2&pagination[perPage]=2').catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 400,
          data: {
            message: 'Request for "GET /pets" does not match OpenApi Schema',
            errors: ['[request.query.pagination.page] (minimum) should be >= 0'],
          },
        });

        await expect(api.get('/unknown-url').catch((error) => error.response)).resolves.toMatchObject({
          status: 404,
          data: {
            message: 'Request for "GET /unknown-url" did not match any of the paths defined in the OpenApi Schema',
          },
        });

        expect(await api.get('/about', { headers: { Authorization: 'Bearer 123' } })).toMatchObject({
          status: 200,
          headers: {
            'content-type': 'text/html',
          },
          data: `<html>\n  <body>\n    ABOUT TEXT\n  </body>\n</html>`,
        });

        expect(await api.get('/pets')).toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
          ],
        });

        await expect(api.post('/pets', { other: 'New Puppy' }).catch((error) => error.response)).resolves.toMatchObject(
          {
            status: 400,
            data: {
              errors: [
                '[request.headers] (required) is missing [x-trace-token] keys',
                '[request.body] (required) is missing [name] keys',
              ],
              message: 'Request for "POST /pets" does not match OpenApi Schema',
            },
          },
        );

        await expect(
          api
            .post('/pets', { name: 'New Puppy' }, { headers: { 'X-Trace-Token': '123' } })
            .catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 400,
          data: {
            errors: ['[request.headers.x-trace-token] (format) should match uuid format'],
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
            errors: ['[request.headers] (required) is missing [x-trace-token] keys'],
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
          status: 403,
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
          api
            .post(
              '/pets',
              { name: 'New Puppy' },
              {
                headers: {
                  Authorization: 'Bearer 123',
                  'X-Trace-Token': '123e4567-e89b-12d3-a456-426655440000',
                },
              },
            )
            .catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 403,
          data: { message: 'Unathorized user' },
        });

        await expect(
          api
            .post(
              '/pets',
              { name: 'New Puppy' },
              {
                headers: {
                  Authorization: 'Bearer 123',
                  'X-API-KEY': 'Not Me',
                  'X-Trace-Token': '123e4567-e89b-12d3-a456-426655440000',
                },
              },
            )
            .catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 403,
          data: { message: 'Unathorized user' },
        });

        await expect(
          api.post(
            '/pets',
            { name: 'New Puppy' },
            {
              headers: {
                Authorization: 'Bearer 123',
                'X-API-KEY': 'Me',
                'X-Trace-Token': '123e4567-e89b-12d3-a456-426655440000',
              },
            },
          ),
        ).resolves.toMatchObject({
          status: 200,
          data: { pet: { id: 223, name: 'New Puppy' }, user: 'dinkey' },
        });

        await expect(
          api.post(
            '/pets',
            { name: 'Cookie Puppy' },
            {
              headers: { Cookie: 'auth=Me', 'X-Trace-Token': '123e4567-e89b-12d3-a456-426655440000' },
              withCredentials: true,
            },
          ),
        ).resolves.toMatchObject({
          status: 200,
          data: { pet: { id: 224, name: 'Cookie Puppy' }, user: 'cookie' },
        });

        await expect(api.get('/pets/111', { headers: { Authorization: 'Basic 123' } })).resolves.toMatchObject({
          status: 200,
          data: { id: 111, name: 'Catty', tag: 'kitten' },
        });

        await expect(
          api.get('/pets/10000', { headers: { Authorization: 'Basic 123' } }).catch((error) => error.response),
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
          api.get('/pets/000', { headers: { Authorization: 'Basic 123' } }).catch((error) => error.response),
        ).resolves.toMatchObject({ status: 404, data: { code: 123, message: 'Not Found' } });

        await expect(api.get('/pets/223', { headers: { Authorization: 'Basic 123' } })).resolves.toMatchObject({
          status: 200,
          data: { id: 223, name: 'New Puppy' },
        });

        await expect(api.get('/pets')).resolves.toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
            { id: 223, name: 'New Puppy' },
            { id: 224, name: 'Cookie Puppy' },
          ],
        });

        await expect(api.get('/pets', { params: { limit: 3 } })).resolves.toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
            { id: 223, name: 'New Puppy' },
          ],
        });

        await expect(
          api.get('/pets', { params: { limit: '3.2' } }).catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 400,
          data: expect.objectContaining({
            errors: ['[request.query.limit] (type) should be of type integer'],
          }),
        });

        await expect(
          api.get('/pets', { params: { limit: 'three' } }).catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 400,
          data: expect.objectContaining({
            errors: ['[request.query.limit] (type) should be of type integer'],
          }),
        });

        await expect(api.get('/pets', { params: { isKitten: true } })).resolves.toMatchObject({
          status: 200,
          data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
        });

        await expect(api.get('/pets', { params: { isKitten: 'yes' } })).resolves.toMatchObject({
          status: 200,
          data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
        });

        await expect(api.get('/pets', { params: { isKitten: 1 } })).resolves.toMatchObject({
          status: 200,
          data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
        });

        await expect(api.get('/pets', { params: { isKitten: '1' } })).resolves.toMatchObject({
          status: 200,
          data: [{ id: 111, name: 'Catty', tag: 'kitten' }],
        });

        await expect(
          api.get('/pets', { params: { isKitten: 'test' } }).catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 400,
          data: expect.objectContaining({
            errors: ['[request.query.isKitten] (type) should be of type boolean'],
          }),
        });

        await expect(api.get('/pets', { params: { price: 6.8 } })).resolves.toMatchObject({
          status: 200,
          data: [
            { id: 223, name: 'New Puppy' },
            { id: 224, name: 'Cookie Puppy' },
          ],
        });

        await expect(
          api.get('/pets', { params: { price: 'test' } }).catch((error) => error.response),
        ).resolves.toMatchObject({
          status: 400,
          data: expect.objectContaining({
            errors: ['[request.query.price] (type) should be of type number,integer'],
          }),
        });

        await expect(api.get('/pets', { params: { isKitten: false, limit: 2 } })).resolves.toMatchObject({
          status: 200,
          data: [
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
            { id: 223, name: 'New Puppy' },
          ],
        });

        await expect(api.get('/pets', { params: { isKitten: 'no', limit: 2 } })).resolves.toMatchObject({
          status: 200,
          data: [
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
            { id: 223, name: 'New Puppy' },
          ],
        });

        await expect(api.get('/pets', { params: { isKitten: '0', limit: 2 } })).resolves.toMatchObject({
          status: 200,
          data: [
            { id: 222, name: 'Doggy', addedOn: '2021-01-01T00:00:00.000Z' },
            { id: 223, name: 'New Puppy' },
          ],
        });

        await expect(
          api.delete('/pets/228', { headers: { 'X-API-KEY': 'Me' } }).catch((error) => error.response),
        ).resolves.toMatchObject({ status: 404, data: { code: 12, message: 'Item not found' } });

        await expect(
          api.delete('/pets/222', { headers: { 'X-API-missing': 'Me' } }).catch((error) => error.response),
        ).resolves.toMatchObject({ status: 403, data: { message: 'Unathorized user' } });

        await expect(api.delete('/pets/222', { headers: { 'X-API-KEY': 'Me' } })).resolves.toMatchObject({
          status: 204,
          data: {},
        });

        await expect(api.get('/pets')).resolves.toMatchObject({
          status: 200,
          data: [
            { id: 111, name: 'Catty', tag: 'kitten' },
            { id: 223, name: 'New Puppy' },
            { id: 224, name: 'Cookie Puppy' },
          ],
        });
      } catch (error) {
        console.log(isAxiosError(error) ? error?.response?.data : String(error));
        throw error;
      }

      expect(log.info).toHaveBeenNthCalledWith(1, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(2, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(3, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(4, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(5, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(6, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(7, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(8, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(9, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(10, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(11, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(12, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(13, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(14, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(15, 'Auth Successful');
      expect(log.info).toHaveBeenNthCalledWith(16, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(17, 'Auth Successful');
      expect(log.info).toHaveBeenNthCalledWith(18, 'Auth Successful');
      expect(log.info).toHaveBeenNthCalledWith(19, 'Auth Successful');
      expect(log.info).toHaveBeenNthCalledWith(
        20,
        'new pet New Puppy, trace token: 123e4567-e89b-12d3-a456-426655440000',
      );
      expect(log.info).toHaveBeenNthCalledWith(
        21,
        'new pet Cookie Puppy, trace token: 123e4567-e89b-12d3-a456-426655440000',
      );
      expect(log.info).toHaveBeenNthCalledWith(22, 'Get all');
      expect(log.info).toHaveBeenNthCalledWith(23, 'Get all');
    });
  });
});
