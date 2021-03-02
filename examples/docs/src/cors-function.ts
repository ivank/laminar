import { httpServer, start, describe, textOk, corsMiddleware } from '@ovotech/laminar';

const app = () => textOk('OK');

// << middleware

/**
 * allowOrigin can be a function
 */
const cors = corsMiddleware({ allowOrigin: (origin) => origin.endsWith('.com') });

// middleware

/**
 * Apply cors and start http server
 */
start(httpServer({ app: cors(app) })).then((http) => console.log(describe(http)));
