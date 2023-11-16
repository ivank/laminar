import { router, jsonOk, get, staticAssets, htmlNotFound, init, HttpService } from '@laminar/laminar';
import { join } from 'path';

// << app

const listener = router(
  get('/.well-known/health-check', async () => jsonOk({ success: 'ok' })),
  /**
   * You can pass configuration options
   */
  staticAssets('/my-assets', join(__dirname, '../../assets'), {
    index: 'index.htm',
    acceptRanges: false,
    indexNotFound: async () => htmlNotFound('<html>Not Found</html>'),
    fileNotFound: async () => htmlNotFound('<html>No File</html>'),
  }),
);

// app

/**
 * Start the http service
 */
init({ initOrder: [new HttpService({ listener })], logger: console });
