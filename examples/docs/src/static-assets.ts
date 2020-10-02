import { router, jsonOk, get, staticAssets } from '@ovotech/laminar';
import { join } from 'path';

export const app = router(
  get('/.well-known/health-check', () => jsonOk({ success: 'ok' })),
  /**
   * All the files from the 'assets' directory are going to be served
   */
  staticAssets('/my-assets', join(__dirname, 'assets')),
);
