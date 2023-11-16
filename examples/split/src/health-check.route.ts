import { AppRoute, jsonOk } from '@laminar/laminar';

export const healthCheck: AppRoute = async () => jsonOk({ health: 'ok' });
