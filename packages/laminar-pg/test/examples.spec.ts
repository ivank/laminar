import axios, { AxiosRequestConfig } from 'axios';
import { execSync, spawn } from 'child_process';
import { join } from 'path';
import { readdirSync, unlinkSync } from 'fs';

const examplesDir = join(__dirname, '../examples/');

let port = 5000;

describe('Example files', () => {
  beforeAll(() => execSync('yarn tsc', { cwd: examplesDir }));
  afterAll(() =>
    readdirSync(examplesDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, file))),
  );

  it.each<[string, AxiosRequestConfig, unknown]>([
    ['examples/simple.ts', { method: 'GET', url: '/test' }, [{ col: 'example' }]],
    ['examples/enum-arrays.ts', { method: 'GET', url: '/test' }, [{ col: ['Pending', 'Active'] }]],
    [
      'examples/transactions.ts',
      { method: 'GET', url: '/test' },
      [
        { id: expect.any(Number), name: 'transaction-test1' },
        { id: expect.any(Number), name: 'transaction-test2' },
      ],
    ],
    [
      'examples/transactions-isolation-level.ts',
      { method: 'GET', url: '/test' },
      [{ id: expect.any(Number), name: 'transaction-test1' }],
    ],
  ])('Should process %s', async (file, testRequest, expected) => {
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

      const { data } = await api.request(testRequest);
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
