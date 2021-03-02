import { httpServer, start, describe, textOk, corsMiddleware } from '@ovotech/laminar';

const app = () => textOk('OK');

// << middleware

/**
 * Regex middleware, matching http://localhost, https://localhost, http://example.com, https://example.com
 */
const cors = corsMiddleware({ allowOrigin: /https?\:\/\/(localhost|example\.com)/ });

// middleware

/**
 * Apply cors and start http server
 */
start(httpServer({ app: cors(app) })).then((http) => console.log(describe(http)));
