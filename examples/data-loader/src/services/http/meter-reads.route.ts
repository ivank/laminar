import { jsonOk } from '@laminar/laminar';
import { PgContext } from '@laminar/pg';
import { PathV1MeterreadsGet } from '../../__generated__/schema';
import { meterReadsSelectQuery } from '../../queries/meter-reads-select.query';

export const meterReadsRoute: PathV1MeterreadsGet<PgContext> = async ({ db, query: { serialNumber, date } }) => {
  const items = await meterReadsSelectQuery(db, { serialNumber, date });
  return jsonOk(items);
};
