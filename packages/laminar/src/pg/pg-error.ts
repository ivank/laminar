export class PgError extends Error {
  public queryText: string;
  public position: number | undefined;

  constructor(message: string, queryText: string, position?: number) {
    super(message);
    this.queryText = queryText;
    this.position = position;
  }
}
