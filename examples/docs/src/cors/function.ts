import { HttpService, init, textOk, corsMiddleware } from '@laminarjs/laminar';

const listener = async () => textOk('OK');

// << middleware

/**
 * allowOrigin can be a function
 */
const cors = corsMiddleware({ allowOrigin: (origin) => origin.endsWith('.com') });

// middleware

/**
 * Apply cors and start http server
 */
init({ initOrder: [new HttpService({ listener: cors(listener) })], logger: console });
