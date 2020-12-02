import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { Readable } from 'stream';

/**
 * The initial Request that comes from node's [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
 */
export interface Request {
  incommingMessage: IncomingMessage;
}

/**
 * Used throughout the project to express "empty object"
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Empty = {};

/**
 * A response that can be rendered by Laminar direcrectly, and would not need to be processed.
 * All response bodies should be converted to tbis
 */
export type ResponseBody = Readable | Buffer | string;

/**
 * A strongly typed response object.
 * You can use the various response helpers to produce / modfiy those objects.
 *
 * For example those helpers would return a response type object: {@link response}, {@link jsonOk}, {@link jsonNotFound}, {@link htmlOk}
 *
 * @typeParam Content The strict type of the content. Used by type generators to specify the required body type as a type literal
 * @typeParam Status The strict status type. Used by type generators to specify the status as a type literal, for example `302 | 200`
 * @category Response
 */
export interface Response<Content = unknown, Status = number> {
  /**
   * The body content. Should be {@link ResponseBody} or anything that the {@link responseParserComponent} can parse.
   * You can add custom response parser to be able to process different types of objects.
   */
  body: Content;

  /**
   * HTTP status. for example 200 or 404
   * https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
   */
  status: Status;

  /**
   * An object that would be set to the [http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)
   *
   * Multiple values are supported as well, using an array `string[]`.
   *
   * For more examples look at [http.ServerResponse.setHeader](https://nodejs.org/api/http.html#http_response_setheader_name_value)
   */
  headers: OutgoingHttpHeaders;
}

/**
 * Convert a incommingMessage request into a laminar response. Used as a core building block.
 * It is passed into the {@link requestListener} function and used internally inside all the default laminar components
 *
 * @typeParam TRequest a basic request that must contain `incommingMessage` param
 */
export type Resolver<TRequest extends Request = Request> = (req: TRequest) => Response | Promise<Response>;

/**
 * An internal middleware that relies only on `incommingMessage` param.
 * Difference with {@link Middleware} is that Components are internal and only rely on the raw `incommingRequest` property.
 * Different internal components would parse and populate the parameters of an eventual {@link AppRequest}
 *
 * You can compose components in order to build a larger app.
 * Each component would process the request parameters and add new ones, that would be available to downstream components.
 *
 * ```typescript
 * const app: Resolver = ...;
 *
 * const component1: Component = ...;
 * const component2: Component = ...;
 *
 * const appWithComponents = component1(component2(app));
 * ```
 *
 * @typeParam TProvide Specify what parameters the component would add into the {@link Request}. Should be one of {@link AppRequest}
 * @typeParam TRequire Specify what parameters to require from the {@link Request}. This would ensure where it is placed when calling the components in the flow.
 * @typeParam TInherit A helper type to allow Typescript to correctly infer the types of all the previous / next components in the flow
 * @returns A function to compose with other components over a resolver
 */
export type Component<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <
  TInherit extends Request = Request
>(
  next: Resolver<TProvide & TRequire & TInherit>,
) => Resolver<TRequire & TInherit>;
