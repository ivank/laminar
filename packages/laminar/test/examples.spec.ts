import axios, { AxiosRequestConfig } from 'axios';
import { execSync, spawn } from 'child_process';
import { readdirSync, unlinkSync } from 'fs';
// import { Agent } from 'https';
import { join } from 'path';
import nock from 'nock';
import { OutgoingHttpHeaders } from 'http2';

nock('http://example.com').get('/new/22').reply(200, { isNew: true });

const examplesDir = join(__dirname, '../examples/');

let port = 4800;

describe('Example files', () => {
  beforeAll(() => execSync('yarn tsc', { cwd: examplesDir }));
  afterAll(() =>
    readdirSync(examplesDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, file))),
  );

  it.each<[string, AxiosRequestConfig, unknown, OutgoingHttpHeaders]>([
    [
      'examples/body-parser.ts',
      {
        method: 'POST',
        url: '/',
        data: 'one,two,three',
        headers: { 'Content-Type': 'text/csv' },
      },
      ['one', 'two', 'three'],
      {},
    ],
    [
      'examples/cors.ts',
      {
        method: 'GET',
        url: '/.well-known/health-check',
        headers: { Origin: 'http://example.com' },
      },
      { health: 'ok' },
      {},
    ],
    [
      'examples/default-route.ts',
      {
        method: 'GET',
        url: '/unknown',
        validateStatus: (status) => status === 404,
      },
      'Woopsy',
      {},
    ],
    [
      'examples/echo-auth-log-db.ts',
      {
        method: 'GET',
        url: '/',
        headers: { Authorization: 'Me' },
      },
      { url: 'http://localhost:4804/', user: 'Me' },
      {},
    ],
    [
      'examples/echo-auth-log.ts',
      {
        method: 'POST',
        url: '/',
        data: ['Testing'],
        headers: { Authorization: 'Me' },
      },
      'Testing',
      {},
    ],
    [
      'examples/echo-auth.ts',
      {
        method: 'GET',
        url: '/tmp',
        headers: { Authorization: 'Me' },
      },
      'http://localhost:4806/tmp',
      {},
    ],
    [
      'examples/echo.ts',
      {
        method: 'POST',
        url: '/',
        data: 'data',
        headers: { 'Content-Type': 'text/plain' },
      },
      'data',
      {},
    ],
    [
      'examples/logging.ts',
      {
        method: 'PUT',
        url: '/users/4',
        data: '"Tester"',
        headers: { 'Content-Type': 'application/json' },
      },
      'Tester',
      {},
    ],
    [
      'examples/response.ts',
      {
        method: 'GET',
        url: '/html/object',
      },
      '<html>OK</html>',
      {},
    ],
    [
      'examples/response.ts',
      {
        method: 'GET',
        url: '/text-stream',
      },
      'one\n',
      {},
    ],
    [
      'examples/router.ts',
      {
        method: 'GET',
        url: '/users/2',
      },
      'Foo',
      {},
    ],
    ['examples/simple.ts', { method: 'GET', url: '/.well-known/health-check' }, { health: 'ok' }, {}],
    // [
    //   'examples/simple-https.ts',
    //   {
    //     method: 'GET',
    //     url: 'https://localhost:8443/.well-known/health-check',
    //     httpsAgent: new Agent({ ca: readFileSync(join(__dirname, '../examples/ca.pem')) }),
    //   },
    //   { health: 'ok' },
    //   {},
    // ],
    [
      'examples/static-assets.ts',
      {
        method: 'GET',
        url: '/my-folder/texts/one.txt',
      },
      `one\n`,
      {},
    ],
    [
      'examples/oapi-security.ts',
      {
        method: 'GET',
        url: '/user',
        headers: { Authorization: 'Bearer my-secret-token' },
      },
      { email: 'me@example.com' },
      {},
    ],
    [
      'examples/oapi.ts',
      {
        method: 'GET',
        url: '/user',
      },
      { email: 'me@example.com' },
      {},
    ],
    [
      'examples/oapi-cookie.ts',
      {
        method: 'POST',
        url: '/user',
        data: { email: 'with-cookie@example.com' },
      },
      { result: 'ok', user: { email: 'with-cookie@example.com' } },
      { 'set-cookie': ['session=me%40example.com'] },
    ],
    [
      'examples/oapi-split.ts',
      {
        method: 'GET',
        url: '/user',
      },
      { email: 'me@example.com' },
      {},
    ],
    [
      'examples/oapi-split.ts',
      {
        method: 'POST',
        url: '/user',
        data: { wrong: 'other@example.com' },
      },
      {
        errors: ['[request.body] (required) is missing [email] keys'],
        message: 'Request for "POST /user" does not match OpenApi Schema',
        schema: {
          allOf: [
            {
              discriminator: {
                propertyName: 'headers',
              },
              oneOf: [
                {
                  properties: {
                    body: {
                      $ref: 'file://./oapi-split-types.yaml#/components/schemas/User',
                    },
                    headers: {
                      properties: {
                        'content-type': {
                          pattern: 'application\\/json',
                          type: 'string',
                        },
                      },
                      required: ['content-type'],
                      type: 'object',
                    },
                  },
                },
              ],
              required: ['body'],
            },
          ],
        },
      },
      {},
    ],
    [
      'examples/oapi-undocumented-routes.ts',
      {
        method: 'GET',
        url: '/old/22',
      },
      { isNew: true },
      {},
    ],
    [
      'examples/conversion.ts',
      {
        method: 'GET',
        url: '/user',
      },
      { email: 'me@example.com', createdAt: '2020-01-01T12:00:00.000Z' },
      {},
    ],
    [
      'examples/streaming-parser.ts',
      {
        method: 'GET',
        headers: {
          'content-type': 'text/csv',
        },
        url: '/',
        data: 'column1,column2\na,b\nc,d',
      },
      'COLUMN1,COLUMN2\nA,B\nC,D\n',
      {},
    ],
  ])('Should process %s', async (file, config, expected, expectedHeaders) => {
    port += 1;
    const service = spawn('yarn', ['node', file.replace('.ts', '.js')], {
      cwd: join(__dirname, '..'),
      detached: true,
      env: { ...process.env, LAMINAR_HTTP_PORT: String(port) },
    });
    const errorLogger = (data: Buffer): void => console.error(data.toString());

    try {
      service.stderr.on('data', errorLogger);
      await new Promise((resolve) => {
        service.stdout.on('data', (data) =>
          String(data).includes('Started ⛲ Laminar') ? resolve(undefined) : undefined,
        );
      });
      const api = axios.create({ baseURL: `http://localhost:${port}` });
      const { data, headers } = await api.request(config).catch((error) => error?.response);
      expect(data).toEqual(expected);
      if (expectedHeaders) {
        expect(headers).toMatchObject(expectedHeaders);
      }
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      service.stderr.off('data', errorLogger);
      if (service.pid !== undefined) {
        process.kill(-service.pid);
      }
    }
  });
});
