import { router, get, put } from '@ovotech/laminar';
import { find } from './find.route';
import { healthCheck } from './health-check.route';
import { update } from './update.route';

export const routes = router(
  get('/.well-known/health-check', healthCheck),
  get('/users/{id}', find),
  put('/users/{id}', update),
);
