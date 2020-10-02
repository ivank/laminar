import { corsMiddleware } from '@ovotech/laminar';

/**
 * allowOrigin can be a function
 */
export const cors = corsMiddleware({ allowOrigin: (origin) => origin.endsWith('.com') });
