import { htmlBadRequest, HttpErrorHandler, HttpService, init, jsonBadRequest } from '@laminar/laminar';

const listener = async () => {
  throw new Error('example error');
};

// << errorHandler
const globalErrorHandler: HttpErrorHandler = async ({ url, error }) => {
  const message = error instanceof Error ? error.message : String(error);
  if (url.pathname.endsWith('html')) {
    return htmlBadRequest(`<html><body>${message}</body></html>`);
  } else {
    return jsonBadRequest({ message });
  }
};

const service = new HttpService({
  errorHandler: globalErrorHandler,
  listener,
});
// errorHandler

init({ initOrder: [service], logger: console });
