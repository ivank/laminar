import { Component } from '../types';
import { TLSSocket } from 'tls';
import { Socket } from 'net';
import { IncomingHttpHeaders } from 'http';
import { URL } from 'url';

export interface RequestUrl {
  /**
   * The host header, takes proxies into account using x-forwarded-host into account
   */
  host: string;

  /**
   * Check if the incommingMessage is from a TLSSocket or Socket
   */
  protocol: 'http' | 'https';

  /**
   * http.IncomingHttpHeaders from the incommingMessage
   */
  headers: IncomingHttpHeaders;

  /**
   * The full url of the request, with host and protocol information
   */
  url: URL;

  /**
   * http.IncomingHttpHeaders.method
   */
  method: string;
}

/**
 * A component that parses the url and header information from the raw incommingMessage
 * And adding `host`, `protocol`, `headers`, `url` and `method` properties
 *
 * @category component
 */
export const urlComponent = (): Component<RequestUrl> => (next) => (req) => {
  const socket: TLSSocket | Socket = req.incommingMessage.socket;
  const protocol = socket instanceof TLSSocket && socket.encrypted ? 'https' : 'http';
  const headers = req.incommingMessage.headers;
  const method = req.incommingMessage.method ?? '';
  const host = (headers['x-forwarded-host'] as string)?.split(',')[0] ?? headers['host'];
  const url = new URL(req.incommingMessage.url ?? '', `${protocol}://${host}`);

  return next({ ...req, host, protocol, headers, url, method });
};
