import { inspect } from 'util';

/**
 * An axios error for easier testing.
 *
 * @category http
 */
export class AxiosError extends Error {
  public constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly data: unknown,
    public readonly stack?: string,
  ) {
    super(`HttpError ${code}\nMessage: ${message}\nBody: ${inspect(data, { depth: 10 })}\n`);
  }
}
