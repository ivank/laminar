import { App, jsonOk } from '@ovotech/laminar';

/**
 * Returns the url path being accessed
 */
export const app: App = ({ incommingMessage }) => {
  return jsonOk({ accessedUrl: incommingMessage.url });
};
