import { spawn } from 'child_process';
import { join } from 'path';
import axios from 'axios';
import { Client } from 'pg';

const PORT = '8831';
const PG = 'postgres://example-admin:example-pass@localhost:5432/example';

describe('Split App Integration Tests', () => {
  it('Should work as an app', async () => {
    const pg = new Client(PG);
    await pg.connect();
    await pg.query(`DELETE FROM users`);
    await pg.query(`INSERT INTO users (id, name) VALUES (1, 'Ben'), (2, 'Michael');`);
    await pg.end();

    const service = spawn('yarn', ['ts-node', 'src/index.ts'], {
      cwd: join(__dirname, '..'),
      env: { PG, PORT, PATH: process.env.PATH },
      detached: true,
    });

    try {
      service.stderr.on('data', (data) => console.error(String(data)));
      await new Promise((resolve) => {
        service.stdout.on('data', (data) =>
          String(data).includes('Laminar: Running') ? resolve(undefined) : undefined,
        );
      });

      const api = axios.create({ baseURL: `http://localhost:${PORT}` });

      await expect(api.get('/users/1')).resolves.toMatchObject({
        status: 200,
        data: { id: 1, name: 'Ben' },
      });

      await expect(api.get('/users/2')).resolves.toMatchObject({
        status: 200,
        data: { id: 2, name: 'Michael' },
      });

      const charlie = await api.put('/users/1', { name: 'Charlie' });

      expect(charlie).toMatchObject({
        status: 200,
        data: { message: 'User Updated' },
      });

      await expect(api.get('/users/1')).resolves.toMatchObject({
        status: 200,
        data: { id: 1, name: 'Charlie' },
      });
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      process.kill(-service.pid);
    }
  });
});
