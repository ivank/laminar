import axios, { AxiosRequestConfig } from 'axios';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { Agent } from 'https';
import { join } from 'path';

describe('Example files', () => {
  it.each<[string, AxiosRequestConfig, unknown]>([
    [
      'examples/body-parser.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333',
        data: 'one,two,three',
        headers: { 'Content-Type': 'text/csv' },
      },
      ['one', 'two', 'three'],
    ],
    [
      'examples/cors.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/.well-known/health-check',
        headers: { Origin: 'http://example.com' },
      },
      { health: 'ok' },
    ],
    [
      'examples/default-route.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/unknown',
        validateStatus: (status) => status === 404,
      },
      'Woopsy',
    ],
    [
      'examples/echo-auth-log-db.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333',
        headers: { Authorization: 'Me' },
      },
      { url: 'http://localhost:3333/', user: 'Me' },
    ],
    [
      'examples/echo-auth-log.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333',
        data: ['Testing'],
        headers: { Authorization: 'Me' },
      },
      'Testing',
    ],
    [
      'examples/echo-auth.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/tmp',
        headers: { Authorization: 'Me' },
      },
      'http://localhost:3333/tmp',
    ],
    [
      'examples/echo.ts',
      {
        method: 'POST',
        url: 'http://localhost:3333',
        data: 'data',
        headers: { 'Content-Type': 'text/plain' },
      },
      'data',
    ],
    [
      'examples/logging.ts',
      {
        method: 'PUT',
        url: 'http://localhost:3333/users/4',
        data: '"Tester"',
        headers: { 'Content-Type': 'application/json' },
      },
      'Tester',
    ],
    [
      'examples/response.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/html/object',
      },
      '<html>OK</html>',
    ],
    [
      'examples/router.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/users/2',
      },
      'Foo',
    ],
    [
      'examples/simple.ts',
      { method: 'GET', url: 'http://localhost:3333/.well-known/health-check' },
      { health: 'ok' },
    ],
    [
      'examples/simple-https.ts',
      {
        method: 'GET',
        url: 'https://localhost:8443/.well-known/health-check',
        httpsAgent: new Agent({ ca: readFileSync(join(__dirname, '../examples/ca.pem')) }),
      },
      { health: 'ok' },
    ],
    [
      'examples/static-assets.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/my-folder/texts/one.txt',
      },
      `one\n`,
    ],
  ])('Should process %s', async (file, config, expected) => {
    const service = spawn('yarn', ['ts-node', file], {
      cwd: join(__dirname, '..'),
      detached: true,
    });
    const errorLogger = (data: Buffer): void => console.error(data.toString());

    try {
      service.stderr.on('data', errorLogger);
      await new Promise((resolve) => {
        service.stdout.on('data', (data) =>
          String(data).includes('Laminar: Running') ? resolve() : undefined,
        );
      });
      const { data } = await axios.request(config);
      expect(data).toEqual(expected);
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      service.stderr.off('data', errorLogger);
      process.kill(-service.pid);
    }
  });
});
