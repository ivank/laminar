import { inspect } from 'util';
import { format } from 'winston';

/**
 * A custom winston console formatter
 * To show a nicer log in the console, like:
 *
 * ```
 * info: GET /v1/meter-reads': 200 { request: 'GET /v1/meter-reads' }
 * info: POST /v1/hydration/meter-reads: 200 { request: 'POST /v1/hydration/meter-reads' }
 * info: GET /v1/meter-reads: 200 { request: 'GET /v1/meter-reads' }
 * ```
 */
export const consoleTransportFormat = format.combine(
  format.colorize(),
  format.printf(({ level, message, metadata }) => {
    const details =
      metadata && Object.keys(metadata).length ? inspect(metadata, { breakLength: 120, colors: true, depth: 10 }) : '';
    return `${level}: ${message} ${details}`;
  }),
);
