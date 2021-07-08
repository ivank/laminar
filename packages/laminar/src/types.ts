/**
 * Used throughout the project to express "empty object"
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Empty = {};

// << Service
/**
 * A type that needs to be implemented by all laminar services.
 *
 * If a class implements it, you can put it in `initOrder` for {@link init}, {@link run}, {@link start}, {@link stop} commands
 *
 * @category application
 */
export interface Service {
  start(): Promise<this>;
  stop(): Promise<this>;
  describe(): string;
}
// Service

/**
 * A type to help with creating specific middlewares.
 * Allows you to say create a middleware for a function that takes those specific arguments and returns a specific type.
 * This is used throughout laminar to define type like {@link HttpMiddleware } and {@link WorkerMiddleware}
 *
 * For example this will create a middlware type for function that would always accept `MyRequest` type.
 *
 * ```typescript
 * interface MyRequest {
 *    text: string;
 * }
 * type MyMiddleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = AbstractMiddleware<MyRequest, void, TProvide, Trequire>;
 * ```
 */
export type AbstractMiddleware<TRequest, TResponse, TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <
  TInherit extends TRequest,
>(
  next: (ctx: TProvide & TRequire & TInherit) => Promise<TResponse>,
) => (ctx: TRequire & TInherit) => Promise<TResponse>;

/**
 * An middleware that uses {@link HttpContext} and modifies it to be used by the app or the downstream middlewares
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
 * @typeParam TProvide Specify what parameters the component would add into the {@link HttpContext}.
 * @typeParam TRequire Specify what parameters to require from the {@link HttpContext}.
 * @typeParam TInherit A helper type to allow Typescript to correctly infer the types of all the previous / next middleware in the flow
 * @returns A function to compose with other middlewares over an app
 */
export type Middleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <TInherit, TResponse>(
  next: (ctx: TProvide & TRequire & TInherit) => Promise<TResponse>,
) => (ctx: TRequire & TInherit) => Promise<TResponse>;
