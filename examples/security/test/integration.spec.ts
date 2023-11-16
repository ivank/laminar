import { spawn } from 'child_process';
import { join } from 'path';
import axios from 'axios';

describe('Security App Integration Tests', () => {
  jest.setTimeout(10000);
  it('Should work as an app', async () => {
    const service = spawn('yarn', ['ts-node', 'src/index.ts'], {
      cwd: join(__dirname, '..'),
      detached: true,
      env: { ...process.env, LAMINAR_HTTP_PORT: '4500' },
    });

    try {
      service.stderr.on('data', (data) => console.error(String(data)));
      await new Promise((resolve) => {
        service.stdout.on('data', (data) => (String(data).includes('Started') ? resolve(undefined) : undefined));
      });

      const api = axios.create({ baseURL: `http://localhost:4500` });

      await expect(api.get('/user/3').catch((error) => error.response)).resolves.toMatchObject({
        status: 403,
        data: { message: 'Unkown user' },
      });

      await expect(api.get('/user/3', { headers: { Authorization: 'Secret Pass' } })).resolves.toMatchObject({
        status: 200,
        data: { id: '3', name: 'John' },
      });
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      if (service.pid !== undefined) {
        process.kill(-service.pid);
      }
    }
  });
});
