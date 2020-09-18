import { OutgoingHttpHeaders } from 'http';

export class HttpError extends Error {
  public readonly code: number;
  public readonly body: { message: string; [key: string]: unknown };
  public readonly headers?: OutgoingHttpHeaders;

  public constructor(
    code: number,
    body: { message: string; [key: string]: unknown },
    headers?: OutgoingHttpHeaders,
  ) {
    super(body.message);
    this.code = code;
    this.body = body;
    this.headers = headers;
  }
}
