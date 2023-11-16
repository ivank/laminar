import { HttpService, jsonOk, init } from '@laminarjs/laminar';

const listener = async () => jsonOk({ ok: true });

// << hostname
/**
 * Listen only to localhost
 */
const localhost = new HttpService({ hostname: 'localhost', listener });

/**
 * Listen only to all
 */
const internet = new HttpService({ hostname: '0.0.0.0', listener });

/**
 * Listen node's default (all)
 */
const all = new HttpService({ listener });
// hostname

localhost.port = 5101;
internet.port = 5102;

init({ initOrder: [localhost, internet, all], logger: console });
