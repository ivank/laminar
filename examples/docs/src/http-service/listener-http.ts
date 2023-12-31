import { HttpListener, HttpService, jsonOk, init } from '@laminarjs/laminar';

// << listener-http
const httpListener: HttpListener = async (ctx) => jsonOk({ message: ctx.body });
// listener-http

const service = new HttpService({ listener: httpListener });

init({ initOrder: [service], logger: console });
