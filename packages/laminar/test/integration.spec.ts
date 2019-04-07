import { createServer, Server } from 'http';
import fetch from 'node-fetch';
import { del, get, HttpError, laminar, post, routes } from '../src';

let server: Server;

describe('Integration', () => {
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
    const healthCheckWithSlash = await fetch('http://localhost:8092/.well-known/health-check/');
    const other = await fetch('http://localhost:8092/.well-known/health-check/other');
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
    expect(other.status).toEqual(404);
    expect(await healthCheck.json()).toEqual({ health: 'ok' });
    expect(await healthCheckWithSlash.json()).toEqual({ health: 'ok' });
    expect(await userJohn.json()).toEqual({ id: '10', name: 'John' });
    expect(await userTom.json()).toEqual({ id: '20', name: 'Tom' });
    expect(userUnknown.status).toEqual(404);
    expect(await userChange.json()).toEqual({ saved: true });
    expect(await userChanged.json()).toEqual({ id: '10', name: 'Kostas' });
    expect(await userDelete.json()).toEqual({ deleted: true });
    expect(userDeleted.status).toEqual(404);
  });
});
