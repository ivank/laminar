import { HttpService, init, textOk, corsMiddleware } from '@ovotech/laminar';

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
init({ services: [new HttpService({ listener: cors(listener) })], logger: console });
