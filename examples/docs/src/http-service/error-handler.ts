import { htmlBadRequest, HttpErrorHandler, HttpService, init, jsonBadRequest } from '@ovotech/laminar';

const listener = async () => {
  throw new Error('example error');
};

// << errorHandler
const globalErrorHandler: HttpErrorHandler = async ({ url, error }) => {
  if (url.pathname.endsWith('html')) {
    return htmlBadRequest(`<html><body>${error.message}</body></html>`);
  } else {
    return jsonBadRequest({ message: error.message });
  }
};

const service = new HttpService({
  errorHandler: globalErrorHandler,
  listener,
});
// errorHandler

init({ initOrder: [service], logger: console });
