import { Resolver, Request, Response, Empty } from '../types';
import { BodyParser, bodyParserComponent, RequestBody } from './body-parser.component';
import { cookieParserComponent, RequestCookie } from './cookie-parser.component';
import { queryParserComponent, RequestQuery } from './query-parser.component';
import { urlComponent, RequestUrl } from './url.component';
import { ResponseParser, responseParserComponent } from './response-parser.component';
import { ErrorHandler, errorHandlerComponent } from './error-handler.component';

/**
 * An parsed request containing request body, cookies etc.
 *
 * More info in the individaul components
 */
export type AppRequest = Request & RequestUrl & RequestBody & RequestCookie & RequestQuery;

/**
 * A resolver that uses all the components from {@link AppRequest}
 */
export type AppComponents = (app: App) => Resolver;

/**
 * A pure function to convert an {@link AppRequest} into a {@link Response} object
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export type App<TRequest extends Empty = Empty> = (req: AppRequest & TRequest) => Response | Promise<Response>;

/**
 * An middleware that uses {@link AppRequest} and modifies it to be used by the app or the downstream middlewares
 *
 * You can compose middlewares in order to build a larger app.
 * Each middlewares would process the request parameters and add new ones, that would be available to downstream components.
 *
 * ```typescript
 * const app: App = ...;
 *
 * const middleware1: Middleware = ...;
 * const middleware2: Middleware = ...;
 *
 * const appWithMiddlewares = middleware1(middleware2(app));
 * ```
 *
 * @typeParam TProvide Specify what parameters the component would add into the {@link AppRequest}.
 * @typeParam TRequire Specify what parameters to require from the {@link AppRequest}.
 * @typeParam TInherit A helper type to allow Typescript to correctly infer the types of all the previous / next middleware in the flow
 * @returns A function to compose with other middlewares over an app
 */
export type Middleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <
  TInherit extends AppRequest = AppRequest
>(
  next: Resolver<TProvide & TRequire & TInherit>,
) => Resolver<TRequire & TInherit>;

/**
 * Options supplied when creating the laminar application with {@link httpServer} (or {@link httpsServer}).
 * Would be passed down to the appropriate components.
 */
export interface AppOptions {
  /**
   * Convert a response body into a string / buffer / readable stream
   *
   * Default parsers:
   *
   *  - json
   *  - url encoded
   *
   * Each parser would be checked in turn, calling the match function with contentType as argument
   * If it returns true, would call the parse function on it
   *
   * If no parser is matched, would call String() on the response body
   */
  responseParsers?: ResponseParser[];

  /**
   * Parse incomming request body
   *
   * Default parsers:
   *
   *  - json
   *  - url encoded
   *  - text
   */
  bodyParsers?: BodyParser[];

  /**
   * Global error handler
   */
  errorHandler?: ErrorHandler;
}

/**
 * Combine all the components into a single middleware, and allow passing options to individual component
 */
export function appComponents(options?: AppOptions): AppComponents {
  return (app) => {
    const responseParser = responseParserComponent(options?.responseParsers);
    const url = urlComponent();
    const bodyParser = bodyParserComponent(options?.bodyParsers);
    const cookieParser = cookieParserComponent();
    const queryParser = queryParserComponent();
    const errorHandler = errorHandlerComponent(options?.errorHandler);

    return responseParser(errorHandler(url(bodyParser(cookieParser(queryParser(app))))));
  };
}
