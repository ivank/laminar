export class HttpError extends Error {
  public readonly code: number;
  public readonly body: { message: string; [key: string]: unknown };

  public constructor(code: number, body: { message: string; [key: string]: unknown }) {
    super(body.message);
    this.code = code;
    this.body = body;
  }
}
