import { LoggerContext } from '@laminarjs/laminar';
import { PgContext } from '@laminarjs/pg';
import { JobWorker } from '@laminarjs/pgboss';
import { meterReadsInsertQuery, InsertMeterRead } from '../../queries/meter-reads-insert.query';

export interface Import {
  csv: InsertMeterRead[];
}

export const importWorker: JobWorker<Import, LoggerContext & PgContext> = async ({ data: { csv }, db }) => {
  await meterReadsInsertQuery(db, csv);
};
