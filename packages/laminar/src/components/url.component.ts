import { Component } from '../types';
import { TLSSocket } from 'tls';
import { Socket } from 'net';
import { IncomingHttpHeaders } from 'http';
import { URL } from 'url';

export interface RequestUrl {
  host: string;
  protocol: 'http' | 'https';
  headers: IncomingHttpHeaders;
  url: URL;
  method: string;
}

export const urlComponent = (): Component<RequestUrl> => (next) => (req) => {
  const socket: TLSSocket | Socket = req.incommingMessage.socket;
  const protocol = socket instanceof TLSSocket && socket.encrypted ? 'https' : 'http';
  const headers = req.incommingMessage.headers;
  const method = req.incommingMessage.method ?? '';
  const host = (headers['x-forwarded-host'] as string)?.split(',')[0] ?? headers['host'];
  const url = new URL(req.incommingMessage.url ?? '', `${protocol}://${host}`);

  return next({ ...req, host, protocol, headers, url, method });
};
