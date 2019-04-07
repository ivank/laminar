export class OapiResolverError extends Error {
  constructor(message: string, readonly errors: string[] = []) {
    super(message);
  }
}
