/**
 * A postgres error that contains the query and the position of the error.
 *
 * @category pg
 */
export class PgError extends Error {
  public queryText: string;
  public position: number | undefined;

  constructor(message: string, queryText: string, position?: number) {
    super(message);
    this.queryText = queryText;
    this.position = position;
  }
}
