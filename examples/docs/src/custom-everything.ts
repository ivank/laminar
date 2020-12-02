import { requestListener, response, Resolver, errorHandlerComponent, urlComponent } from '@ovotech/laminar';
import { createServer } from 'http';

/**
 * A resolver is a function that gets a raw request and returns a Response object.
 * By default the requestListener would supply only the raw unprocessed incomming message
 */
const app: Resolver = ({ incommingMessage }) => response({ body: incommingMessage.url });

export const server = createServer({}, requestListener(app));

/**
 * We can add back a few the default components for our app
 */
const errorHandler = errorHandlerComponent();
const url = urlComponent();

export const serverWithErrorHandling = createServer({}, requestListener(errorHandler(url(app))));
