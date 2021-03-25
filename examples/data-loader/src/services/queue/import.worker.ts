import { LoggerContext } from '@ovotech/laminar';
import { PgContext } from '@ovotech/laminar-pg';
import { JobWorker } from '@ovotech/laminar-pgboss';
import { meterReadsInsertQuery, InsertMeterRead } from '../../queries/meter-reads-insert.query';

export interface Import {
  csv: InsertMeterRead[];
}

export const importWorker: JobWorker<Import, LoggerContext & PgContext> = async ({ data: { csv }, db }) => {
  await meterReadsInsertQuery(db, csv);
};
