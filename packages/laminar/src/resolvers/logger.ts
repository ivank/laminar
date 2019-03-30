// tslint:disable:no-console
import { Middleware } from '../types';

export interface WithLogger {
  logger: (message?: any, ...optionalParams: any[]) => void;
}

export const logger: Middleware<WithLogger> = resolver => {
  return async ctx => {
    return resolver({ ...ctx, logger: console.log });
  };
};
