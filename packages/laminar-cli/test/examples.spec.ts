import axios, { AxiosRequestConfig } from 'axios';
import { exec, spawn } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

describe('Example files', () => {
  it.each<[string, AxiosRequestConfig, unknown]>([
    [
      'examples/api.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/test',
      },
      { text: 'ok', user: { email: 'me@example.com' } },
    ],
    [
      'examples/convertion.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/user',
      },
      { email: 'me@example.com', createdAt: '2020-01-01T12:00:00.000Z' },
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

  it.each<[string, string]>([
    ['examples/axios.ts', `{ text: 'test', user: { email: 'test@example.com' } }`],
    // ['examples/axios-petstore.ts', `INVENTORY`],
  ])('Should process %s', async (file, expected) => {
    const { stdout, stderr } = await promisify(exec)(`yarn ts-node ${file}`, {
      cwd: join(__dirname, '..'),
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(expected);
  });
});
