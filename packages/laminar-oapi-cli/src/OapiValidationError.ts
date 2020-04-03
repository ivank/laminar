export class OapiValidationError extends Error {
  public readonly errors: string[];

  public constructor(message: string, errors: string[] = []) {
    super(message);
    this.errors = errors;
  }

  public toString(): string {
    return `Error: ${this.message}\n${this.errors.map((item) => ` | ${item}`).join('\n')}\n`;
  }
}
