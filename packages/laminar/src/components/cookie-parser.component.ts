import { Component, Response } from '../types';
import * as cookie from 'cookie';

/**
 * Set additional paramters for the cookie
 */
export interface SetCookie extends cookie.CookieSerializeOptions {
  value: string;
}

/**
 * All the cookies from the request
 */
export interface Cookies {
  [key: string]: string;
}

/**
 * Request parameters added by the {@link cookieParserComponent}
 */
export interface RequestCookie {
  /**
   * Values from the parsed cookie header. In the format: { [cookie name]: value }
   */
  cookies: Cookies | undefined;
}

export const parseCookies = (cookieHeader: string | undefined): Cookies | undefined =>
  cookieHeader ? cookie.parse(cookieHeader) : undefined;

/**
 * Parse incomming cookies and put them in the `cookies` property
 */
export const cookieParserComponent = (): Component<RequestCookie> => (next) => (req) =>
  next({ ...req, cookies: parseCookies(req.incommingMessage.headers.cookie) });

/**
 * Set cookie heders on the response
 *
 * @category component
 */
export const setCookie = (cookies: { [key: string]: string | SetCookie }, response: Response): Response => ({
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
