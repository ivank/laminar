import { corsMiddleware } from '@ovotech/laminar';

/**
 * Regex middleware, matching http://localhost, https://localhost, http://example.com, https://example.com
 */
export const cors = corsMiddleware({ allowOrigin: /https?\:\/\/(localhost|example\.com)/ });
