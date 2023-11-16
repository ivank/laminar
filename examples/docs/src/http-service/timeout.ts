import { HttpService, jsonOk, init } from '@laminarjs/laminar';

const listener = async () => jsonOk({ ok: true });

// << timeout
const service = new HttpService({ timeout: 120000, listener });
// timeout

init({ initOrder: [service], logger: console });
