import axios, { AxiosRequestConfig } from 'axios';
import { spawn } from 'child_process';
import { join } from 'path';

describe('Example files', () => {
  it.each<[string, AxiosRequestConfig, unknown]>([
    [
      'examples/html.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/',
      },
      `<body>\n  <div>HEADER</div>\n  INDEX\n</body>\n`,
    ],
    [
      'examples/direct.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/',
      },
      `<body>\n  <div>HEADER</div>\n  INDEX\n</body>\n`,
    ],
    [
      'examples/yaml.ts',
      {
        method: 'GET',
        url: 'http://localhost:3333/swagger.yaml',
      },
      `openapi: '3.0.0'\ninfo:\n  version: 10\n`,
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
