import {
  Middleware,
  App,
  textForbidden,
  textOk,
  start,
  httpServer,
  describe,
} from '@ovotech/laminar';

const auth: Middleware = (next) => (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: Middleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: App = (req) => textOk(req.body);

const server = httpServer({ port: 3333, app: log(auth(app)) });
start(server).then(() => console.log(describe(server)));
