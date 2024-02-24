import { toRequestListener, response, HttpListener, errorsMiddleware, toHttpRequest } from '@laminarjs/laminar';
import { createServer } from 'http';

/**
 * A resolver is a function that gets a raw request and returns a Response object.
 * By default the requestListener would supply only the raw unprocessed incoming message
 */
const app: HttpListener = async ({ incomingMessage }) => response({ body: incomingMessage.url });

export const server = createServer(
  {},
  toRequestListener((msg) => app(toHttpRequest(msg))),
);

/**
 * We can add back a few the default components for our app
 */
const errorHandler = errorsMiddleware();
const appWithErrorHandler = errorHandler(app);

export const serverWithErrorHandling = createServer(
  {},
  toRequestListener((msg) => appWithErrorHandler(toHttpRequest(msg))),
);
