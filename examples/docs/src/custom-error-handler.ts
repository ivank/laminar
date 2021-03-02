import { App, htmlInternalServerError, httpServer, ErrorHandler, start, describe } from '@ovotech/laminar';

// << app
const app: App = () => {
  throw new Error('Testing error');
};

const errorHandler: ErrorHandler = ({ error }) => htmlInternalServerError(`<html>${error.message}</html>`);

const server = httpServer({
  app,
  /**
   * You can configure the default error handler with `errorHandler`
   */
  options: { errorHandler },
});
// app

start(server).then((http) => console.log(describe(http)));
