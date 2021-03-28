import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Client } from 'pg';
import { Agent } from 'https';
import * as nock from 'nock';
import { readFileSync } from 'fs';

let port = 4300;
const PG = 'postgres://example-admin:example-pass@localhost:5432/example';
let db: Client;

nock('http://example.com').get('/new/22').reply(200, { isNew: true });

describe('Docs examples', () => {
  beforeAll(async () => {
    db = new Client({ connectionString: PG });
    await Promise.all([
      promisify(exec)('yarn tsc'),
      db.connect().then(async () => {
        await db.query('DELETE FROM db_users');
        await db.query('DELETE FROM db_users2');
      }),
    ]);
  });

  afterAll(() => db.end());

  it.each<[string, Array<{ req: AxiosRequestConfig; res: Partial<AxiosResponse> }>]>([
    [
      'src/http-service/port.ts',
      [
        { req: { url: 'http://localhost:5100' }, res: { status: 200 } },
        { req: { url: '/' }, res: { status: 200 } },
      ],
    ],
    [
      'src/http-service/hostname.ts',
      [
        { req: { url: 'http://localhost:5101' }, res: { status: 200 } },
        { req: { url: 'http://localhost:5102' }, res: { status: 200 } },
        { req: { url: '/' }, res: { status: 200 } },
      ],
    ],
    ['src/http-service/timeout.ts', [{ req: { url: '/' }, res: { status: 200 } }]],
    ['src/http-service/http.ts', [{ req: { url: '/' }, res: { status: 200 } }]],
    [
      'src/http-service/https.ts',
      [
        {
          req: {
            url: 'https://localhost:{port}/',
            httpsAgent: new Agent({ ca: readFileSync(join(__dirname, '../src/http-service/ca.pem')) }),
          },
          res: { status: 200 },
        },
      ],
    ],
    ['src/http-service/response-parsers.ts', [{ req: { url: '/' }, res: { status: 200, data: '1,2,3' } }]],
    [
      'src/http-service/body-parsers.ts',
      [
        {
          req: {
            url: '/',
            headers: { 'content-type': 'text/csv' },
            method: 'POST',
            data: 'one,two,three\n1,2,3\n4,5,6',
          },
          res: {
            status: 200,
            data: {
              ok: true,
              body: [
                ['one', 'two', 'three'],
                ['1', '2', '3'],
                ['4', '5', '6'],
              ],
            },
          },
        },
      ],
    ],
    [
      'src/http-service/body-parser-streaming.ts',
      [
        {
          req: {
            url: '/',
            headers: { 'content-type': 'text/csv' },
            method: 'POST',
            data: 'a,b,c\n1,2,3\nd,e,f\n4,5,6',
          },
          res: {
            status: 200,
            data: 'a-b-c|1-2-3|d-e-f4-5-6',
          },
        },
      ],
    ],
    [
      'src/http-service/error-handler.ts',
      [
        {
          req: { url: '/index.html' },
          res: { status: 400, data: '<html><body>example error</body></html>' },
        },
        {
          req: { url: '/index.json' },
          res: { status: 400, data: { message: 'example error' } },
        },
      ],
    ],
    ['src/http-service/listener-simple.ts', [{ req: { url: '/' }, res: { status: 200 } }]],
    ['src/http-service/listener-http.ts', [{ req: { url: '/' }, res: { status: 200 } }]],
    ['src/http-service/listener-current-date.ts', [{ req: { url: '/' }, res: { status: 200 } }]],
    [
      'src/http-service-router/function.ts',
      [
        {
          req: { url: '/users/3' },
          res: { status: 200, data: { accessedUrl: '/users/3' } },
        },
      ],
    ],
    [
      'src/http-service-router/simple.ts',
      [
        {
          req: { method: 'GET', url: '/users/3' },
          res: { status: 200, data: { id: '3', name: 'John' } },
        },
      ],
    ],
    [
      'src/http-service-router/complex.ts',
      [
        {
          req: { url: '/blog/1/authors/20' },
          res: { status: 200, data: ['Hapiness', 'Bob'] },
        },
      ],
    ],
    [
      'src/http-service-router/regex.ts',
      [
        {
          req: { url: '/names/10' },
          res: { status: 200, data: 'Dave' },
        },
      ],
    ],
    [
      'src/http-service-router/static-assets.ts',
      [
        {
          req: { url: '/.well-known/health-check' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/star.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/svg.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/other.txt' },
          res: { status: 404, data: 'File not found' },
        },
      ],
    ],
    [
      'src/http-service-router/static-assets-options.ts',
      [
        {
          req: { url: '/.well-known/health-check' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/star.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/svg.svg' },
          res: { status: 200 },
        },
        {
          req: { url: '/my-assets/other.txt' },
          res: { status: 404, data: '<html>No File</html>' },
        },
      ],
    ],
    [
      'src/http-service-open-api/simple.ts',
      [{ req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } }],
    ],
    [
      'src/http-service-open-api/simple-typed.ts',
      [{ req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } }],
    ],
    [
      'src/http-service-open-api/json.ts',
      [{ req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } }],
    ],
    [
      'src/http-service-open-api/object.ts',
      [{ req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } }],
    ],
    [
      'src/http-service-open-api/external.ts',
      [{ req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } }],
    ],
    [
      'src/http-service-open-api/not-found.ts',
      [
        { req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } },
        { req: { url: '/old/22' }, res: { data: { isNew: true } } },
        { req: { url: '/something-else' }, res: { status: 404 } },
      ],
    ],
    [
      'src/http-service-open-api/middlewares.ts',
      [{ req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } }],
    ],
    [
      'src/http-service-open-api/middlewares-typed.ts',
      [{ req: { url: '/user/10' }, res: { status: 200, data: { id: '10', name: 'John' } } }],
    ],
    [
      'src/http-service-open-api/security.ts',
      [
        {
          req: { url: '/user/10', headers: { Authorization: 'Bearer my-secret-token' } },
          res: { status: 200, data: { user: { id: '10', name: 'John' }, auth: { email: 'me@example.com' } } },
        },
        { req: { url: '/user/10' }, res: { status: 401 } },
      ],
    ],
    [
      'src/http-service-open-api/security-typed.ts',
      [
        {
          req: { url: '/user/10', headers: { Authorization: 'Bearer my-secret-token' } },
          res: { status: 200, data: { user: { id: '10', name: 'John' }, auth: { email: 'me@example.com' } } },
        },
        { req: { url: '/user/10' }, res: { status: 401 } },
      ],
    ],
    [
      'src/cors/simple.ts',
      [
        {
          req: {
            method: 'OPTIONS',
            url: '/user/3',
            headers: { Origin: 'http://example.com' },
          },
          res: {
            headers: {
              'access-control-allow-origin': 'http://example.com',
              'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
            },
          },
        },
      ],
    ],
    [
      'src/cors/regex.ts',
      [
        {
          req: { method: 'OPTIONS', url: '/test', headers: { Origin: 'https://localhost' } },
          res: {
            status: 204,
            headers: {
              'access-control-allow-origin': 'https://localhost',
              'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
            },
          },
        },
      ],
    ],
    [
      'src/cors/function.ts',
      [
        {
          req: { method: 'OPTIONS', url: '/test', headers: { Origin: 'https://example.com' } },
          res: {
            status: 204,
            headers: {
              'access-control-allow-origin': 'https://example.com',
              'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
            },
          },
        },
      ],
    ],
    [
      'src/cors/options.ts',
      [
        {
          req: { method: 'OPTIONS', url: '/test', headers: { Origin: 'https://localhost' } },
          res: {
            status: 204,
            headers: {
              'access-control-allow-origin': 'http://localhost',
              'access-control-allow-credentials': 'true',
              'access-control-allow-methods': 'POST,GET',
              'access-control-allow-headers': 'Authorization,X-Authorization',
            },
          },
        },
      ],
    ],
    [
      'src/database.ts',
      [
        {
          req: { method: 'POST', url: '/user', data: { name: 'Peter' } },
          res: {
            status: 200,
            data: { id: expect.any(Number), name: 'Peter' },
          },
        },
      ],
    ],
    [
      'src/database-multiple.ts',
      [
        {
          req: { method: 'POST', url: '/user', data: { name: 'Peter' } },
          res: {
            status: 200,
            data: { id: expect.any(Number), name: 'Peter' },
          },
        },
      ],
    ],
    [
      'src/application.ts',
      [
        {
          req: { method: 'GET', url: '/' },
          res: { status: 200 },
        },
      ],
    ],
  ])('Should work for %s', async (file, testConfigs) => {
    port += 1;
    const jsFile = file.replace('src', 'dist').replace('.ts', '.js');

    const service = spawn('yarn', ['node', jsFile], {
      cwd: join(__dirname, '..'),
      detached: true,
      env: { ...process.env, LAMINAR_HTTP_PORT: String(port), PG, PG_BACKUP: PG },
    });

    try {
      service.stderr.on('data', (data) => console.error(String(data)));
      await new Promise((resolve) => {
        service.stdout.on('data', (data) =>
          String(data).includes('Started ⛲ Laminar') ? resolve(undefined) : undefined,
        );
      });

      const api = axios.create({ baseURL: `http://localhost:${port}` });

      for (const { req, res } of testConfigs) {
        const currentReq = { ...req, url: req.url?.replace('{port}', String(port)) };
        const apiRes = await api.request(currentReq).catch((error) => {
          if (error.response) {
            return error.response;
          } else {
            throw error;
          }
        });
        expect(apiRes).toMatchObject(res);
      }
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      process.kill(-service.pid);
    }
  });
});
