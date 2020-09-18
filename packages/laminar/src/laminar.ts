import * as http from 'http';
import * as https from 'https';
import { Readable } from 'stream';
import { toArray } from './helpers';
import { appComponent, AppOptions, App } from './components/app.component';
import { Resolver } from './types';

export const laminarRequestListener = (resolver: Resolver): http.RequestListener => {
  return async (incommingMessage, serverResponse) => {
    const response = await resolver({ incommingMessage });

    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      const values = toArray(headerValue).map((item) => String(item));
      if (values.length) {
        serverResponse.setHeader(headerName.toLowerCase(), values);
      }
    }

    serverResponse.statusCode = response.status;

    response.body instanceof Readable
      ? response.body.pipe(serverResponse)
      : serverResponse.end(response.body);
  };
};

export interface OptionsBase {
  app: App;
  options?: AppOptions;
  port?: number;
  hostname?: string;
}

export interface OptionsHttp extends OptionsBase {
  http?: http.ServerOptions;
}

export interface OptionsHttps extends OptionsBase {
  https: https.ServerOptions;
}

export type Options = OptionsHttp | OptionsHttps;

export interface Laminar<S = http.Server | https.Server> {
  port: number;
  hostname: string;
  server: S;
}

export function laminar(options: OptionsHttp): Laminar<http.Server>;
export function laminar(options: OptionsHttps): Laminar<https.Server>;
export function laminar(options: Options): Laminar {
  const { port = 3300, hostname = 'localhost' } = options;
  const requestListener = laminarRequestListener(appComponent(options.options)(options.app));

  const server =
    'https' in options
      ? https.createServer(options.https, requestListener)
      : http.createServer(typeof options.http === 'object' ? options.http : {}, requestListener);
  return { server, port, hostname };
}

export const start = ({ server, port, hostname }: Laminar): Promise<void> =>
  new Promise((resolve) => server.listen(port, hostname, resolve));

export const stop = ({ server }: Laminar): Promise<void> =>
  new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));

export const describe = (laminar: Laminar): string => {
  const address = laminar.server.address();
  const url =
    typeof address === 'object' && address
      ? `${address.address}:${address.port} (${address.family})`
      : address;

  return ` ⛲ Laminar: ${laminar.server.listening ? 'Running' : 'Stopped'}, Address: ${url}`;
};
