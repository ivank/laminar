/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Used by {@link LoggerLike} to display additional metadata
 */
export interface LoggerMetadata {
  [key: string]: unknown;
}

/**
 * The context that includes a {@link LoggerLike} logger, used by
 *
 * - {@link loggerMiddleware}
 * - {@link requestLoggingMiddleware}
 * - {@link jobLoggingMiddleware}
 *
 * @category logger
 */
export interface LoggerContext {
  logger: LoggerLike;
}

/**
 * An interface all loggers for laminar must conform too.
 * Is the least common denominator between node's Console and winston's logger.
 *
 * ```typescript
 * logger.info('Log message', { stack: 'some jucy details' });
 * ```
 * *
 * @category logger
 */
export interface LoggerLike {
  debug: (message: any, metadata?: LoggerMetadata) => void;
  info: (message: any, metadata?: LoggerMetadata) => void;
  warn: (message: any, metadata?: LoggerMetadata) => void;
  error: (message: any, metadata?: LoggerMetadata) => void;
}

/**
 * Bake in some metadata for each logger call afterwards, reusing the same logger instance.
 *
 * Useful for adding trace tokens and the like
 *
 * ```typescript
 * const myLogger = console
 * const myLoggerTraced = withStaticMetadata(myLogger, { traceToken: '123' });
 *
 * // Would output 'trace' with the traceToken metadata we've setup earlier.
 * myLoggerTraced.info('test');
 * ```
 *
 * @category logger
 */
export function withStaticMetadata(logger: LoggerLike, staticMetadata: LoggerMetadata): LoggerLike {
  return {
    info(message, metadata) {
      logger.info(message, { ...metadata, ...staticMetadata });
    },

    error(message, metadata) {
      logger.error(message, { ...metadata, ...staticMetadata });
    },

    debug(message, metadata) {
      logger.debug(message, { ...metadata, ...staticMetadata });
    },

    warn(message, metadata) {
      logger.warn(message, { ...metadata, ...staticMetadata });
    },
  };
}
