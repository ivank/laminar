import { router, jsonOk, get, staticAssets, init, HttpService } from '@laminar/laminar';
import { join } from 'path';

// << app

const listener = router(
  get('/.well-known/health-check', async () => jsonOk({ success: 'ok' })),
  /**
   * All the files from the 'assets' directory are going to be served
   */
  staticAssets('/my-assets', join(__dirname, '../../assets')),
);

// app

/**
 * Start the http service
 */
init({ initOrder: [new HttpService({ listener })], logger: console });
