import { LoggerContext } from '@laminar/laminar';
import { PgContext } from '@laminar/pg';
import { JobWorker } from '@laminar/pgboss';
import { meterReadsInsertQuery, InsertMeterRead } from '../../queries/meter-reads-insert.query';

export interface Import {
  csv: InsertMeterRead[];
}

export const importWorker: JobWorker<Import, LoggerContext & PgContext> = async ({ data: { csv }, db }) => {
  await meterReadsInsertQuery(db, csv);
};
