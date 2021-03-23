import { HttpListener, htmlInternalServerError, HttpService, HttpErrorHandler, init } from '@ovotech/laminar';

// << app
const listener: HttpListener = () => {
  throw new Error('Testing error');
};

const errorHandler: HttpErrorHandler = async ({ error }) => htmlInternalServerError(`<html>${error.message}</html>`);

const http = new HttpService({
  listener,
  /**
   * You can configure the default error handler with `errorHandler`
   */
  errorHandler,
});
// app

init({ initOrder: [http], logger: console });
