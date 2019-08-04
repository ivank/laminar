export class OapiResolverError extends Error {
  public readonly errors: string[];

  public constructor(message: string, errors: string[] = []) {
    super(message);
    this.errors = errors;
  }
}
