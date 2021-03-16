import { LoggerMetadata } from './logger';
import { PgError } from './pg/pg-error';

export const toErrorMetadata = (error: Error): LoggerMetadata => {
  if (error instanceof PgError) {
    return { queryText: error.queryText, position: error.position, stack: error.stack };
  } else {
    return { stack: error.stack };
  }
};
