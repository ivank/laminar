import { HttpService, jsonOk, init } from '@laminarjs/laminar';

const listener = async () => jsonOk({ ok: true });

// << port
const withPort = new HttpService({ port: 5100, listener });
const basic = new HttpService({ listener });
// port

init({ initOrder: [basic, withPort], logger: console });
