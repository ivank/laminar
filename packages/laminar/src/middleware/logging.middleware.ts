import { AppRequest, Middleware } from '../components/components';
import { Response } from '../types';

export interface Metadata {
  [key: string]: unknown;
}

export interface Logger {
  info: (message: string, metadata?: Metadata) => void;
  error: (message: string, metadata?: Metadata) => void;
}

export interface RequestLogging<TLogger extends Logger = Logger> {
  logger: TLogger;
}

export interface LoggerFormatters {
  request: (req: AppRequest) => Metadata;
  response: (req: AppRequest, res: Response) => Metadata;
  error: (req: AppRequest, error: Error) => Metadata;
}

export const requestUri = (req: AppRequest): string => `${req.method} ${req.url.pathname}`;

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const loggingMiddleware = <TLogger extends Logger>(
  logger: TLogger,
  { request, response, error }: Partial<LoggerFormatters> = {
    response: (req, res) => ({
      request: requestUri(req),
      status: res.status,
      contentType: res.headers['content-type'],
    }),
    request: (req) => ({
      request: requestUri(req),
      contentType: req.headers['content-type'],
    }),
    error: (req, error) => ({
      request: requestUri(req),
      message: error.message,
      stack: error.stack,
    }),
  },
): Middleware<RequestLogging<TLogger>> => (next) => async (req) => {
  try {
    if (request) {
      logger.info('Request', request(req));
    }
    const res = await next({ ...req, logger });
    if (response) {
      logger.info('Response', response(req, res));
    }

    return res;
  } catch (errorOrFailure) {
    const err = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    if (error) {
      logger.error('Error', error(req, err));
    }
    throw err;
  }
};
