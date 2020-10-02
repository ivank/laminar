import { spawn } from 'child_process';
import { join } from 'path';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { app as simpleApp } from '../src/app';
import { app as routerApp } from '../src/router';
import { app as routerRegexApp } from '../src/router-regex';
import { app as staticAssetsApp } from '../src/static-assets';
import { app as staticAssetsOptionsApp } from '../src/static-assets-options';
import { server as customBodyParserServer } from '../src/custom-body-parser';
import { server as customResponseParserServer } from '../src/custom-response-parser';
import { server as customErrorHandlerServer } from '../src/custom-error-handler';
import { cors as corsRegex } from '../src/cors-regex';
import { cors as corsFunction } from '../src/cors-function';
import { cors as corsOptions } from '../src/cors-options';
import { App, httpServer, start, stop, textOk } from '@ovotech/laminar';

describe('Docs examples', () => {
  it.each<[string, AxiosRequestConfig, Partial<AxiosResponse>]>([
    [
      'src/server.ts',
      {
        method: 'GET',
        url: 'http://localhost:3300/users/3',
      },
      { status: 200, data: { id: '3', name: 'John' } },
    ],
    [
      'src/cors.ts',
      {
        method: 'OPTIONS',
        url: 'http://localhost:3300/user/3',
        headers: {
          Origin: 'http://example.com',
        },
      },
      {
        headers: {
          'access-control-allow-origin': 'http://example.com',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        },
      },
    ],
  ])('Should work for %s', async (file, requestConfig, expected) => {
    const service = spawn('yarn', ['ts-node', file], {
      cwd: join(__dirname, '..'),
      detached: true,
    });

    try {
      service.stderr.on('data', (data) => console.error(String(data)));
      await new Promise((resolve) => {
        service.stdout.on('data', (data) =>
          String(data).includes('Laminar: Running') ? resolve() : undefined,
        );
      });

      const api = axios.create({ baseURL: `http://localhost:3300` });
      await expect(api.request(requestConfig)).resolves.toMatchObject(expected);
    } finally {
      /**
       * Since we need to kill the service and _all of its children_ we need to kill the whole group itself
       * https://azimi.me/2014/12/31/kill-child_process-node-js.html
       */
      process.kill(-service.pid);
    }
  });

  it('Should implement simple app', async () => {
    const server = httpServer({ app: simpleApp, port: 8331 });
    const api = axios.create({ baseURL: `http://localhost:8331` });
    try {
      await start(server);
      await expect(api.get('/users/3')).resolves.toMatchObject({
        status: 200,
        data: { accessedUrl: '/users/3' },
      });
    } finally {
      await stop(server);
    }
  });

  it('Should implement router app', async () => {
    const server = httpServer({ app: routerApp, port: 8332 });
    const api = axios.create({ baseURL: `http://localhost:8332` });
    try {
      await start(server);
      await expect(api.get('/blog/1/authors/20')).resolves.toMatchObject({
        status: 200,
        data: ['Hapiness', 'Bob'],
      });
    } finally {
      await stop(server);
    }
  });

  it('Should implement router regex app', async () => {
    const server = httpServer({ app: routerRegexApp, port: 8333 });
    const api = axios.create({ baseURL: `http://localhost:8333` });
    try {
      await start(server);
      await expect(api.get('/names/10')).resolves.toMatchObject({
        status: 200,
        data: 'Dave',
      });
    } finally {
      await stop(server);
    }
  });

  it('Should implement static assets app', async () => {
    const server = httpServer({ app: staticAssetsApp, port: 8334 });
    const api = axios.create({ baseURL: `http://localhost:8334` });
    try {
      await start(server);
      await expect(api.get('/.well-known/health-check')).resolves.toMatchObject({ status: 200 });

      await expect(api.get('/my-assets/star.svg')).resolves.toMatchObject({ status: 200 });
      await expect(api.get('/my-assets/svg.svg')).resolves.toMatchObject({ status: 200 });
      await expect(
        api.get('/my-assets/other.txt').catch((error) => error.response),
      ).resolves.toMatchObject({ status: 404 });
    } finally {
      await stop(server);
    }
  });

  it('Should implement static assets app with options', async () => {
    const server = httpServer({ app: staticAssetsOptionsApp, port: 8335 });
    const api = axios.create({ baseURL: `http://localhost:8335` });
    try {
      await start(server);
      await expect(api.get('/.well-known/health-check')).resolves.toMatchObject({ status: 200 });

      await expect(api.get('/my-assets/star.svg')).resolves.toMatchObject({ status: 200 });
      await expect(api.get('/my-assets/svg.svg')).resolves.toMatchObject({ status: 200 });
      await expect(
        api.get('/my-assets/other.txt').catch((error) => error.response),
      ).resolves.toMatchObject({ status: 404, data: '<html>No File</html>' });
    } finally {
      await stop(server);
    }
  });

  it('Should allow custom body parser', async () => {
    const api = axios.create({ baseURL: `http://localhost:${customBodyParserServer.port}` });
    try {
      await start(customBodyParserServer);
      await expect(
        api.post('/test/star', 'test: { one: "other" }', {
          headers: { 'content-type': 'application/yaml' },
        }),
      ).resolves.toMatchObject({ status: 200, data: { test: { one: 'other' } } });
    } finally {
      await stop(customBodyParserServer);
    }
  });

  it('Should allow custom response parser', async () => {
    const api = axios.create({ baseURL: `http://localhost:${customResponseParserServer.port}` });
    try {
      await start(customResponseParserServer);
      await expect(api.get('/test/star.yaml')).resolves.toMatchObject({
        status: 200,
        data: 'example:\n  test: msg\n',
      });
    } finally {
      await stop(customResponseParserServer);
    }
  });

  it('Should allow custom error handler', async () => {
    const api = axios.create({ baseURL: `http://localhost:${customErrorHandlerServer.port}` });
    try {
      await start(customErrorHandlerServer);
      await expect(
        api.get('/test/star.yaml').catch((error) => error.response),
      ).resolves.toMatchObject({
        status: 500,
        data: '<html>Testing error</html>',
      });
    } finally {
      await stop(customErrorHandlerServer);
    }
  });

  it('Should be able to use cors with a regex', async () => {
    const api = axios.create({ baseURL: `http://localhost:8858` });
    const app: App = () => textOk('OK');
    const server = httpServer({ port: 8858, app: corsRegex(app) });
    try {
      await start(server);
      await expect(
        api.options('/test', { headers: { Origin: 'https://localhost' } }),
      ).resolves.toMatchObject({
        status: 204,
        headers: {
          'access-control-allow-origin': 'https://localhost',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        },
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to use cors with a function', async () => {
    const api = axios.create({ baseURL: `http://localhost:8859` });
    const app: App = () => textOk('OK');
    const server = httpServer({ port: 8859, app: corsFunction(app) });
    try {
      await start(server);
      await expect(
        api.options('/test', { headers: { Origin: 'https://example.com' } }),
      ).resolves.toMatchObject({
        status: 204,
        headers: {
          'access-control-allow-origin': 'https://example.com',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        },
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to use cors custom options', async () => {
    const api = axios.create({ baseURL: `http://localhost:8860` });
    const app: App = () => textOk('OK');
    const server = httpServer({ port: 8860, app: corsOptions(app) });
    try {
      await start(server);
      await expect(
        api.options('/test', { headers: { Origin: 'https://localhost' } }),
      ).resolves.toMatchObject({
        status: 204,
        headers: {
          'access-control-allow-origin': 'http://localhost',
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'POST,GET',
          'access-control-allow-headers': 'Authorization,X-Authorization',
        },
      });
    } finally {
      await stop(server);
    }
  });
});
