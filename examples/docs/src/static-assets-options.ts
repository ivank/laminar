import { router, jsonOk, get, staticAssets, htmlNotFound } from '@ovotech/laminar';
import { join } from 'path';

export const app = router(
  get('/.well-known/health-check', () => jsonOk({ success: 'ok' })),
  /**
   * You can pass configuration options
   */
  staticAssets('/my-assets', join(__dirname, 'assets'), {
    index: 'index.htm',
    acceptRanges: false,
    indexNotFound: () => htmlNotFound('<html>Not Found</html>'),
    fileNotFound: () => htmlNotFound('<html>No File</html>'),
  }),
);
