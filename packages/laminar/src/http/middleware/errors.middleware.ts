import { json, jsonInternalServerError } from '../response';
import { HttpError } from '../http-error';
import { HttpMiddleware, HttpResponse, HttpContext } from '../types';

/**
 * Request parameters added by the {@link errorsMiddleware}
 */
export interface RequestError {
  error: Error;
}

export type HttpErrorHandler = (ctx: HttpContext & RequestError) => Promise<HttpResponse>;

/**
 * The default error handler, used by {@link errorsMiddleware}. Convert an error object into a json {@link HttpResponse}
 * @category http
 */
export const defaultErrorHandler: HttpErrorHandler = async ({ error }) => {
  return error instanceof HttpError
    ? json({ body: error.body, headers: error.headers, status: error.code, stack: error.stack })
    : jsonInternalServerError({ message: error.message });
};

/**
 * Catch and convert errors into error responses.
 * By default convert to a json with the error message
 *
 * @param errorHandler use the error property to return a response object from an error
 * @category http
 */
export function errorsMiddleware(errorHandler = defaultErrorHandler): HttpMiddleware {
  return (next) => async (ctx) => {
    try {
      return await next(ctx);
    } catch (error) {
      return await errorHandler({ ...ctx, error });
    }
  };
}
