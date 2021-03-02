import { httpServer, start, describe, textOk, corsMiddleware } from '@ovotech/laminar';

const app = () => textOk('OK');

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
start(httpServer({ app: cors(app) })).then((http) => console.log(describe(http)));
