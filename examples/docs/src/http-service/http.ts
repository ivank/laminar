import { HttpService, jsonOk, init } from '@ovotech/laminar';

const listener = async () => jsonOk({ ok: true });

// << http
const service = new HttpService({ http: { maxHeaderSize: 256 }, listener });
// http

init({ initOrder: [service], logger: console });
