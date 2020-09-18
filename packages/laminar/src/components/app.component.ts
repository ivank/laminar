import { Resolver, Request, Response, Empty } from '../types';
import { bodyParserComponent, RequestBody } from './body-parser.component';
import { cookieParserComponent, RequestCookie } from './cookie-parser.component';
import { queryParserComponent, RequestQuery } from './query-parser.component';
import { urlComponent, RequestUrl } from './url.component';
import { responseParserComponent } from './response-parser.component';

export type AppRequest = Request & RequestUrl & RequestBody & RequestCookie & RequestQuery;

export type App<TReq extends Empty = Empty> = (
  req: AppRequest & TReq,
) => Response | Promise<Response>;

export type Middleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <
  TInherit extends AppRequest = AppRequest
>(
  next: Resolver<TProvide & TRequire & TInherit>,
) => Resolver<TRequire & TInherit>;

export interface AppOptions {
  responseParsers?: Parameters<typeof responseParserComponent>[0];
  bodyParsers?: Parameters<typeof bodyParserComponent>[0];
}

export const appComponent = (options?: AppOptions) => (resolver: App): Resolver => {
  const responseParser = responseParserComponent(options?.responseParsers);
  const url = urlComponent();
  const bodyParser = bodyParserComponent(options?.bodyParsers);
  const cookieParser = cookieParserComponent();
  const queryParser = queryParserComponent();

  return responseParser(url(bodyParser(cookieParser(queryParser(resolver)))));
};
