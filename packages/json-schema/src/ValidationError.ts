import { Invalid } from './validation';

export class ValidationError extends Error {
  public readonly errors: (string | Invalid)[];

  public constructor(message: string, errors: (string | Invalid)[] = []) {
    super(`${message}\n${errors.join('\n')}\n`);
    this.errors = errors;
  }
}
