import { Application, HttpService, init, jsonOk, LoggerContext, loggerMiddleware } from '@ovotech/laminar';
import { join } from 'path';

/**
 * A simple function to mock getting data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

// << app
import { openApiTyped } from './__generated__/api.yaml';

const createHttpListener = async () => {
  return await openApiTyped<LoggerContext>({
    api: join(__dirname, '../../schema/api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path, logger }) => {
          logger.info(`Accessed ${path.id}`);
          return jsonOk(findUser(path.id));
        },
      },
    },
  });
};
// app

const createApplication = async (): Promise<Application> => {
  /**
   * Some custom logger, to be passed using a middleware
   */
  const logger = console;
  const withLogger = loggerMiddleware(logger);

  const service = new HttpService({ listener: withLogger(await createHttpListener()) });
  return { initOrder: [service], logger };
};

createApplication().then(init);
