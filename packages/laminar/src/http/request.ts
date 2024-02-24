import { TLSSocket } from 'tls';
import { Socket } from 'net';
import { IncomingMessage } from 'http';
import { URL, URLSearchParams } from 'url';
import { parseQueryObjects } from '../helpers';
import { parseCookie } from './cookie';
import { HttpContext } from './types';

/**
 * A component that parses the url and header information from the raw incomingMessage
 * And adding `host`, `protocol`, `headers`, `url` and `method` properties
 *
 * @category http
 */
export function toHttpRequest(incomingMessage: IncomingMessage): HttpContext {
  const socket: TLSSocket | Socket = incomingMessage.socket;
  const protocol = socket instanceof TLSSocket && socket.encrypted ? 'https' : 'http';
  const headers = incomingMessage.headers;
  const method = incomingMessage.method ?? '';
  const host = (headers['x-forwarded-host'] as string)?.split(',')[0] ?? headers['host'];
  let url = new URL('/', `${protocol}://${host}`);
  try {
    url = new URL(incomingMessage.url ?? '', `${protocol}://${host}`);
  } catch (err) {
    url = new URL('/', `${protocol}://${host}`);
  }
  const query = parseQueryObjects(new URLSearchParams(incomingMessage.url?.split('?')?.[1] ?? ''));
  const cookies = headers.cookie ? parseCookie(headers.cookie) : undefined;

  return { incomingMessage, host, protocol, headers, url, method, cookies, query, body: incomingMessage };
}
