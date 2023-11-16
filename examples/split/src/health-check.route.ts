import { AppRoute, jsonOk } from '@laminarjs/laminar';

export const healthCheck: AppRoute = async () => jsonOk({ health: 'ok' });
