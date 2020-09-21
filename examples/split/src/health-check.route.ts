import { AppRoute, jsonOk } from '@ovotech/laminar';

export const healthCheck: AppRoute = () => jsonOk({ health: 'ok' });
