import { App, htmlInternalServerError, httpServer, ErrorHandler } from '@ovotech/laminar';

const app: App = () => {
  throw new Error('Testing error');
};

const errorHandler: ErrorHandler = ({ error }) => htmlInternalServerError(`<html>${error.message}</html>`);

export const server = httpServer({
  app,
  port: 8897,
  hostname: 'localhost',
  /**
   * You can configure the default error handler with `errorHandler`
   */
  options: { errorHandler },
});
