import { Component, Resolver, Request } from '../types';
import { json, jsonInternalServerError } from '../response';
import { HttpError } from '../HttpError';

/**
 * Request parameters added by the {@link errorHandlerComponent}
 */
export interface RequestError {
  error: Error;
}

export type ErrorHandler<T extends Request = Request> = Resolver<T & RequestError>;

export const defaultErrorHandler: ErrorHandler = ({ error }) => {
  return error instanceof HttpError
    ? json({ body: error.body, headers: error.headers, status: error.code, stack: error.stack })
    : jsonInternalServerError({ message: error.message });
};

/**
 * Catch and convert errors into error responses.
 * By default convert to a json with the error message
 *
 * @param errorHandler use the error property to return a response object from an error
 * @category component
 */
export const errorHandlerComponent = (errorHandler = defaultErrorHandler): Component => (next) => async (req) => {
  try {
    return await next(req);
  } catch (error) {
    return await errorHandler({ ...req, error });
  }
};
