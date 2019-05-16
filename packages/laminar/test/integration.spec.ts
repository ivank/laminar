import { createServer, Server } from 'http';
import fetch from 'node-fetch';
import {
  Context,
  del,
  get,
  HttpError,
  laminar,
  options,
  patch,
  post,
  put,
  redirect,
  response,
  RouteContext,
  routes,
} from '../src';

let server: Server;

interface Item {
  id: string;
  name: string;
}

interface TestContext extends Context, RouteContext {
  body: Item;
}

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
          get('/link', () => redirect('http://localhost:8092/destination')),
          get('/link-other', () =>
            redirect('http://localhost:8092/destination', {
              headers: { Authorization: 'Bearer 123' },
            }),
          ),
          get('/destination', () => ({ arrived: true })),
          get('/error', () => {
            throw new Error('unknown');
          }),
          options('/users/{id}', () =>
            response({
              headers: {
                'Access-Control-Allow-Origin': 'http://localhost:8092',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE',
              },
            }),
          ),
          get('/users/{id}', ({ path }) => {
            if (users[path.id]) {
              return { id: path.id, name: users[path.id] };
            } else {
              throw new HttpError(404, { message: 'No User Found' });
            }
          }),
          put<TestContext>('/users', ({ body }) => {
            users[body.id] = body.name;
            return { added: true };
          }),
          patch<TestContext>('/users/{id}', ({ path, body }) => {
            if (users[path.id]) {
              users[path.id] = body.name;
              return { patched: true };
            } else {
              throw new HttpError(404, { message: 'No User Found' });
            }
          }),
          post<TestContext>('/users/{id}', ({ path, body }) => {
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

    const unknown = fetch('http://localhost:8092/unknown');
    const error = fetch('http://localhost:8092/error');
    const healthCheck = fetch('http://localhost:8092/.well-known/health-check');
    const healthCheckWithSlash = fetch('http://localhost:8092/.well-known/health-check/');
    const other = fetch('http://localhost:8092/.well-known/health-check/other');
    const redirected = fetch('http://localhost:8092/link');
    const redirectedOther = fetch('http://localhost:8092/link-other');
    const preflight = await fetch('http://localhost:8092/users/10', { method: 'OPTIONS' });
    const userJohn = fetch('http://localhost:8092/users/10');
    const userTom = fetch('http://localhost:8092/users/20');
    const userUnknown = fetch('http://localhost:8092/users/30');
    const userChange = await fetch('http://localhost:8092/users/10', {
      body: JSON.stringify({ name: 'Kostas' }),
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const userPatch = await fetch('http://localhost:8092/users/20', {
      body: JSON.stringify({ name: 'Pathing' }),
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
    });
    const userChanged = await fetch('http://localhost:8092/users/10');
    const userDelete = await fetch('http://localhost:8092/users/10', { method: 'DELETE' });
    const userDeleted = await fetch('http://localhost:8092/users/10');
    const userAdd = await fetch('http://localhost:8092/users', {
      method: 'PUT',
      body: JSON.stringify({ id: 30, name: 'Added' }),
      headers: { 'content-type': 'application/json' },
    });
    const userAdded = await fetch('http://localhost:8092/users/30');

    await expect(unknown).resolves.toHaveProperty('status', 404);
    await expect(error).resolves.toHaveProperty('status', 500);
    await expect(error.then(res => res.json())).resolves.toEqual({ message: 'unknown' });

    await expect(healthCheck.then(res => res.json())).resolves.toEqual({ health: 'ok' });
    await expect(healthCheckWithSlash.then(res => res.json())).resolves.toEqual({ health: 'ok' });
    await expect(other).resolves.toHaveProperty('status', 404);
    await expect(redirected.then(res => res.json())).resolves.toEqual({ arrived: true });
    await expect(redirectedOther.then(res => res.json())).resolves.toEqual({ arrived: true });
    expect(preflight.headers.get('Access-Control-Allow-Methods')).toEqual('GET,POST,DELETE');
    await expect(userJohn.then(res => res.json())).resolves.toEqual({ id: '10', name: 'John' });
    await expect(userTom.then(res => res.json())).resolves.toEqual({ id: '20', name: 'Tom' });
    await expect(userUnknown).resolves.toHaveProperty('status', 404);
    expect(await userChange.json()).toEqual({ saved: true });
    expect(await userPatch.json()).toEqual({ patched: true });
    expect(await userChanged.json()).toEqual({ id: '10', name: 'Kostas' });
    expect(await userDelete.json()).toEqual({ deleted: true });
    expect(userDeleted.status).toEqual(404);
    expect(await userAdd.json()).toEqual({ added: true });
    expect(await userAdded.json()).toEqual({ id: '30', name: 'Added' });
  });
});
