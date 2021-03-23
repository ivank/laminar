import { HttpService, init, textOk, corsMiddleware } from '@ovotech/laminar';

const listener = async () => textOk('OK');

// << middleware

const cors = corsMiddleware({
  /**
   * Allow origin can be a simple string
   */
  allowOrigin: 'http://localhost',
  /**
   * Allow credentials header
   */
  allowCredentials: true,
  /**
   * Allow methods header
   */
  allowMethods: ['POST', 'GET'],
  /**
   * Allow headers header
   */
  allowHeaders: ['Authorization', 'X-Authorization'],
});

// middleware

/**
 * Apply cors and start http server
 */
init({ initOrder: [new HttpService({ listener: cors(listener) })], logger: console });
