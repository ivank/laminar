import { HttpService, jsonOk, init } from '@ovotech/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const listener = async () => jsonOk({ ok: true });

// << https
const service = new HttpService({
  https: {
    key: readFileSync(join(__dirname, '../../src/http-service/key.pem')),
    cert: readFileSync(join(__dirname, '../../src/http-service/cert.pem')),
  },
  listener,
});
// https

init({ initOrder: [service], logger: console });
