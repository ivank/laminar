import { Component, Response } from '../types';
import * as cookie from 'cookie';

export interface SetCookie extends cookie.CookieSerializeOptions {
  value: string;
}

export interface Cookies {
  [key: string]: string;
}

export interface RequestCookie {
  cookies: Cookies | undefined;
}

export const parseCookies = (cookieHeader: string | undefined): Cookies | undefined =>
  cookieHeader ? cookie.parse(cookieHeader) : undefined;

export const cookieParserComponent = (): Component<RequestCookie> => (next) => (req) =>
  next({ ...req, cookies: parseCookies(req.incommingMessage.headers.cookie) });

export const setCookie = (
  cookies: { [key: string]: string | SetCookie },
  response: Response,
): Response => ({
  ...response,
  headers: {
    ...response.headers,
    'set-cookie': Object.entries(cookies).map(([name, content]) => {
      if (typeof content === 'string') {
        return cookie.serialize(name, content);
      } else {
        const { value, ...options } = content;
        return cookie.serialize(name, value, options);
      }
    }),
  },
});
