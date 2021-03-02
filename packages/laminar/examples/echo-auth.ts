import { httpServer, start, textForbidden, textOk, App, Middleware, describe } from '@ovotech/laminar';

const auth: Middleware = (next) => (req) => (req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me'));

const app: App = (req) => textOk(req.url.toString());

const server = httpServer({ app: auth(app) });

start(server).then(() => console.log(describe(server)));
