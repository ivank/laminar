import { LoggerMetadata } from './logger';

/**
 * A generic error that contains the some additional metadata.
 */
export class LaminarError extends Error {
  constructor(message: string, public metadata: LoggerMetadata) {
    super(message);
  }
}

/**
 * Get metadata object for loggers from an error instance
 */
export const toErrorMetadata = (error: Error): LoggerMetadata => {
  if (error instanceof LaminarError) {
    return { ...error.metadata, stack: error.stack };
  } else {
    return { stack: error.stack };
  }
};
