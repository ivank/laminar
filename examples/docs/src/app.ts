import { HttpListener, HttpService, jsonOk, init } from '@ovotech/laminar';

// << app

/**
 * Returns the url path being accessed
 */
const listener: HttpListener = async ({ incommingMessage }) => jsonOk({ accessedUrl: incommingMessage.url });

// app

init({ initOrder: [new HttpService({ listener })], logger: console });
