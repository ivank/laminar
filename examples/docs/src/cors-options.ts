import { corsMiddleware } from '@ovotech/laminar';

export const cors = corsMiddleware({
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
