import { Application, HttpService, init, jsonOk, LoggerContext, loggerMiddleware, openApi } from '@laminar/laminar';
import { join } from 'path';

/**
 * A simple function to mock getting data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

// << app
const createHttpListener = async () => {
  return await openApi<LoggerContext<Console>>({
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

const createApplication = async (): Promise<Application> => {
  /**
   * Some custom logger, to be passed using a middleware
   */
  const logger = console;
  const withLogger = loggerMiddleware(logger);

  const service = new HttpService({ listener: withLogger(await createHttpListener()) });
  return { initOrder: [service], logger };
};
// app

createApplication().then(init);
