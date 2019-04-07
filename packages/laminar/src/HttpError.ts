export class HttpError extends Error {
  constructor(readonly code: number, readonly body: { message: string; [key: string]: any }) {
    super(body.message);
  }
}
