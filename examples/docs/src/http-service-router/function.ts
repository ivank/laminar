import { HttpListener, HttpService, jsonOk, init } from '@laminarjs/laminar';

// << function

/**
 * Returns the url path being accessed
 */
const listener: HttpListener = async ({ incommingMessage }) => jsonOk({ accessedUrl: incommingMessage.url });

// function

init({ initOrder: [new HttpService({ listener })], logger: console });
