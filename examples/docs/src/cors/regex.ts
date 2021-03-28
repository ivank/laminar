import { HttpService, init, textOk, corsMiddleware } from '@ovotech/laminar';

const listener = async () => textOk('OK');

// << middleware

/**
 * Regex middleware, matching http://localhost, https://localhost, http://example.com, https://example.com
 */
const cors = corsMiddleware({ allowOrigin: /https?\:\/\/(localhost|example\.com)/ });

// middleware

/**
 * Apply cors and start http server
 */
init({ initOrder: [new HttpService({ listener: cors(listener) })], logger: console });
