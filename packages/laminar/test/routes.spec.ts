import { createServer, Server } from 'http';
import fetch from 'node-fetch';
import { del, get, HttpError, laminar, post, routes } from '../src';

let server: Server;

describe('Requests', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    const users: any = {
      10: 'John',
      20: 'Tom',
    };
    server = createServer(
      laminar(
        routes(
          get('/.well-known/health-check', () => ({ health: 'ok' })),
          get('/users/{id}', ({ path }) => {
            if (users[path.id]) {
              return { id: path.id, name: users[path.id] };
            } else {
              throw new HttpError(404, { message: 'No User Found' });
            }
          }),
          post('/users/{id}', ({ path, body }) => {
            if (users[path.id]) {
              users[path.id] = body.name;
              return { saved: true };
            } else {
              throw new HttpError(404, { message: 'No User Found' });
            }
          }),
          del('/users/{id}', ({ path }) => {
            if (users[path.id]) {
              delete users[path.id];
              return { deleted: true };
            } else {
              throw new HttpError(404, { message: 'No User Found' });
            }
          }),
        ),
      ),
    );

    await new Promise(resolve => server.listen(8092, resolve));

    const unknown = await fetch('http://localhost:8092/unknown');
    const healthCheck = await fetch('http://localhost:8092/.well-known/health-check');
    const userJohn = await fetch('http://localhost:8092/users/10');
    const userTom = await fetch('http://localhost:8092/users/20');
    const userUnknown = await fetch('http://localhost:8092/users/30');
    const userChange = await fetch('http://localhost:8092/users/10', {
      body: JSON.stringify({ name: 'Kostas' }),
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const userChanged = await fetch('http://localhost:8092/users/10');
    const userDelete = await fetch('http://localhost:8092/users/10', { method: 'DELETE' });
    const userDeleted = await fetch('http://localhost:8092/users/10');

    expect(unknown.status).toEqual(404);
    await expect(healthCheck.json()).resolves.toEqual({ health: 'ok' });
    await expect(userJohn.json()).resolves.toEqual({ id: '10', name: 'John' });
    await expect(userTom.json()).resolves.toEqual({ id: '20', name: 'Tom' });
    expect(userUnknown.status).toEqual(404);
    await expect(userChange.json()).resolves.toEqual({ saved: true });
    await expect(userChanged.json()).resolves.toEqual({ id: '10', name: 'Kostas' });
    await expect(userDelete.json()).resolves.toEqual({ deleted: true });
    expect(userDeleted.status).toEqual(404);
  });
});
