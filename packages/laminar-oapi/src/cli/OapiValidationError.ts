export class OapiValidationError extends Error {
  constructor(message: string, readonly errors: string[] = []) {
    super(message);
  }

  toString() {
    return `Error: ${this.message}\n${this.errors.map(item => ` | ${item}`).join('\n')}\n`;
  }
}
