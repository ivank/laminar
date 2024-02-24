import { HttpListener, HttpService, jsonOk, init } from '@laminarjs/laminar';

// << function

/**
 * Returns the url path being accessed
 */
const listener: HttpListener = async ({ incomingMessage }) => jsonOk({ accessedUrl: incomingMessage.url });

// function

init({ initOrder: [new HttpService({ listener })], logger: console });
