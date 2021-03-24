import { AxiosError } from './http/axios-error';
import { LoggerLike } from './logger';
import { Service } from './types';

/**
 * A recursive list of {@link Service} instances or arrays of {@link Service} instances.
 * @category application
 */
export type InitOrder = Service | InitOrder[];

/**
 * An instance of an application. Should hold the `initOrder` for all of the {@link Service}-es of the application.
 * Would be started in the `initOrder` (and stopped in the reverse of `initOrder` order).
 *
 * Arrays in `initOrder` define services that need to be started / stopped in parallel.
 * @category application
 */
export interface Application {
  /**
   * A recursive nested list of {@link Service}.
   */
  initOrder: InitOrder[];
  /**
   * A logger object that would be used to print out the progress of starting / stopping things.
   * You can pass an {@link Service} here as well, and it would be stopped last.
   */
  logger?: LoggerLike | (LoggerLike & Service);
}

/**
 * @category application
 */
export interface StartLogger {
  /**
   * Should start the logger service, if its a {@link Service} used to break services recursion.
   */
  startLogger?: boolean;
}

/**
 * @category application
 */
export interface StopLogger {
  /**
   * Should stop the logger service, if its a {@link Service} used to break services recursion.
   */
  stopLogger?: boolean;
}

const startService = async (item: Service, logger?: LoggerLike | (LoggerLike & Service)): Promise<void> => {
  logger?.info(`⏫ Starting ${item.describe()}`);
  await item.start();
  logger?.info(`✅ Started ${item.describe()}`);
};

const stopService = async (item: Service, logger?: LoggerLike | (LoggerLike & Service)): Promise<void> => {
  logger?.info(`⏬ Stopping ${item.describe()}`);
  await item.stop();
  logger?.info(`❎ Stopped ${item.describe()}`);
};

/**
 * Start all the {@link Service} objects in `initOrder` sequentially. If it has an array of {@link Service}, will start them in parallel.
 *
 * ```typescript
 * // Will start s1, s2 and s3 in that sequential order
 * start({ initOrder: [s1, s2, s3] });
 *
 * // Will start s1 and s2, then start s3, s4 and s5 in parallel, and lastly start s6
 * start({ initOrder: [s1, s2, [s3, s4, s5], s6] });
 *```
 * @category application
 */
export async function start({ initOrder, logger, startLogger = true }: Application & StartLogger): Promise<void> {
  if (logger && 'start' in logger && startLogger) {
    await logger.start();
  }

  for (const item of initOrder) {
    await ('start' in item
      ? startService(item, logger)
      : Promise.all(
          item.map((child) =>
            'start' in child ? startService(child, logger) : start({ initOrder: child, logger, startLogger: false }),
          ),
        ));
  }
}

/**
 * Stop all the {@link Service} objects in `initOrder` sequentially, in reverse order from {@link start}
 *
 * ```typescript
 * // Will stop s3, s2 and s1 in that sequential order
 * stop({ initOrder: [s1, s2, s3] });
 *
 * // Will stop s6, then s3, s4 and s5 in parallel, and lastly will stop s2 and s1 sequentially
 * start({ initOrder: [s1, s2, [s3, s4, s5], s6] });
 *```
 * @category application
 */
export async function stop({ initOrder, logger, stopLogger = true }: Application & StopLogger): Promise<void> {
  for (const item of initOrder.reverse()) {
    await ('stop' in item
      ? stopService(item, logger)
      : Promise.all(
          item.map((child) =>
            'stop' in child ? stopService(child, logger) : stop({ initOrder: child, logger, stopLogger: false }),
          ),
        ));
  }
  if (logger && 'stop' in logger && stopLogger) {
    logger?.info(`❎ Stop ${logger.describe()}`);
    await logger.stop();
  }
}

/**
 * Run {@link start}, and add a listener to SIGTERM, that would call {@link stop}
 *
 * @category application
 */
export async function init<TApplication extends Application>(app: TApplication): Promise<TApplication> {
  await start(app);
  process.once('SIGTERM', () => stop(app));
  return app;
}

/**
 * Run {@link start}, execute the predicate, and when its finished, call {@link stop}.
 * Useful for testing out the application as you can put your test code in the predicate
 *
 * @category application
 */
export async function run(app: Application, predicate: (app: Application) => Promise<void>): Promise<void> {
  await start(app);
  try {
    await predicate(app);
  } catch (error) {
    throw error.response ? new AxiosError(error.response.status, error.response.data, error.stack) : error;
  } finally {
    await stop(app);
  }
}
