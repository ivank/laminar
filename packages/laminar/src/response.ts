/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { lookup } from 'mime-types';
import { Response } from './types';
import { OutgoingHttpHeaders } from 'http';
import { Readable } from 'stream';
import { createReadStream, statSync } from 'fs';

export type StringResponse = string | Buffer | Readable;

export const response = <T>({
  body,
  status = 200,
  headers = { 'content-type': 'application/json' },
}: Partial<Response<T>> = {}) => ({ body, status, headers });

export const redirect = (
  location: string,
  { status = 302, headers, body = `Redirecting to ${location}.` }: Partial<Response> = {},
): Response => ({
  body,
  status,
  headers: { 'content-type': 'text/plain; charset=utf-8', location, ...headers },
});

export const file = (
  filename: string,
  { headers, status = 200 }: Partial<Response> = {},
): Response => {
  const stat = statSync(filename);
  return {
    status,
    body: createReadStream(filename),
    headers: {
      'content-type': lookup(filename) || 'text/plain',
      'content-length': stat.size,
      'last-modified': stat.mtime.toISOString(),
      ...headers,
    },
  };
};

/**
 * Status
 * ===========================================================================================
 */

/**
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 */
export const ok = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 200 as const,
});

/**
 * The server successfully processed the request, and is not returning any content.
 */
export const noContent = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 204 as const,
});

/**
 * This and all future requests should be directed to the given URI.
 */
export const movedPermanently = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 301 as const,
});

/**
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 */
export const found = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 302 as const,
});

/**
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 */
export const seeOther = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 303 as const,
});

/**
 * Indicates that the resource has not been modified since the version specified by the request headers If-Modified-Since or If-None-Match.
 * In such case, there is no need to retransmit the resource since the client still has a previously-downloaded copy
 */
export const notModified = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 304 as const,
});

/**
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 */
export const badRequest = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 400 as const,
});

/**
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 */
export const unauthorized = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 401 as const,
});

/**
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 */
export const forbidden = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 403 as const,
});

/**
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 */
export const notFound = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 404 as const,
});

/**
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 */
export const internalServerError = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  status: 500 as const,
});

/**
 * Type
 * ===========================================================================================
 */

/**
 * Content Type: application/json
 */
export const json = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'application/json' as const },
});

/**
 * Content-Type: application/yaml
 */
export const yaml = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'application/yaml' as const },
});

/**
 * Content-Type: application/octet-stream
 */
export const binary = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'application/octet-stream' as const },
});

/**
 * Content-Type: application/pdf
 */
export const pdf = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'application/pdf' as const },
});

/**
 * Content-Type: application/xml
 */
export const xml = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'application/xml' as const },
});

/**
 * Content-Type: text/plain
 */
export const text = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'text/plain' as const },
});

/**
 * Content-Type: text/html
 */
export const html = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'text/html' as const },
});

/**
 * Content-Type: text/css
 */
export const css = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'text/css' as const },
});

/**
 * Content-Type: text/csv
 */
export const csv = <T, R extends Partial<Response<T>>>(res: R) => ({
  ...res,
  headers: { ...res.headers, 'content-type': 'text/csv' as const },
});

/**
 * JSON
 * ===========================================================================================
 */

/**
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 *
 * Content Type: application/json
 */
export const jsonOk = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(ok({ body, headers }));

/**
 * The server successfully processed the request, and is not returning any content.
 *
 * Content Type: application/json
 */
export const jsonNoContent = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(noContent({ body, headers }));

/**
 * This and all future requests should be directed to the given URI.
 *
 * Content Type: application/json
 */
export const jsonMovedPermanently = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(movedPermanently({ body, headers }));

/**
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 *
 * Content Type: application/json
 */
export const jsonFound = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(found({ body, headers }));

/**
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 *
 * Content Type: application/json
 */
export const jsonSeeOther = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(seeOther({ body, headers }));

/**
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 *
 * Content Type: application/json
 */
export const jsonBadRequest = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(badRequest({ body, headers }));
/**
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 *
 * Content Type: application/json
 */
export const jsonUnauthorized = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(unauthorized({ body, headers }));

/**
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 *
 * Content Type: application/json
 */
export const jsonForbidden = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(forbidden({ body, headers }));

/**
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 *
 * Content Type: application/json
 */
export const jsonNotFound = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(notFound({ body, headers }));

/**
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 *
 * Content Type: application/json
 */
export const jsonInternalServerError = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  json(internalServerError({ body, headers }));

/**
 * Text
 * ===========================================================================================
 */

/**
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 *
 * Content Type: text/plain
 */
export const textOk = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(ok({ body, headers }));

/**
 * The server successfully processed the request, and is not returning any content.
 *
 * Content Type: text/plain
 */
export const textNoContent = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(noContent({ body, headers }));

/**
 * This and all future requests should be directed to the given URI.
 *
 * Content Type: text/plain
 */
export const textMovedPermanently = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(movedPermanently({ body, headers }));

/**
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 *
 * Content Type: text/plain
 */
export const textFound = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(found({ body, headers }));

/**
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 *
 * Content Type: text/plain
 */
export const textSeeOther = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(seeOther({ body, headers }));

/**
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 *
 * Content Type: text/plain
 */
export const textBadRequest = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(badRequest({ body, headers }));
/**
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 *
 * Content Type: text/plain
 */
export const textUnauthorized = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(unauthorized({ body, headers }));

/**
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 *
 * Content Type: text/plain
 */
export const textForbidden = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(forbidden({ body, headers }));

/**
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 *
 * Content Type: text/plain
 */
export const textNotFound = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(notFound({ body, headers }));

/**
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 *
 * Content Type: text/plain
 */
export const textInternalServerError = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  text(internalServerError({ body, headers }));

/**
 * Html
 * ===========================================================================================
 */

/**
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 *
 * Content Type: text/html
 */
export const htmlOk = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(ok({ body, headers }));

/**
 * This and all future requests should be directed to the given URI.
 *
 * Content Type: text/html
 */
export const htmlMovedPermanently = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(movedPermanently({ body, headers }));

/**
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 *
 * Content Type: text/html
 */
export const htmlFound = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(found({ body, headers }));

/**
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 *
 * Content Type: text/html
 */
export const htmlSeeOther = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(seeOther({ body, headers }));

/**
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 *
 * Content Type: text/html
 */
export const htmlBadRequest = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(badRequest({ body, headers }));
/**
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 *
 * Content Type: text/html
 */
export const htmlUnauthorized = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(unauthorized({ body, headers }));

/**
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 *
 * Content Type: text/html
 */
export const htmlForbidden = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(forbidden({ body, headers }));

/**
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 *
 * Content Type: text/html
 */
export const htmlNotFound = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(notFound({ body, headers }));

/**
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 *
 * Content Type: text/html
 */
export const htmlInternalServerError = <T>(body: T, headers: OutgoingHttpHeaders = {}) =>
  html(internalServerError({ body, headers }));
