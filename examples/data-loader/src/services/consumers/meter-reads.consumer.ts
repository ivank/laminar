import { EachMessageConsumer } from '@laminar/kafkajs';
import { LoggerContext } from '@laminar/laminar';
import { PgContext } from '@laminar/pg';
import { meterReadsInsertQuery, InsertMeterRead } from '../../queries/meter-reads-insert.query';
import { MeterReading } from '../../__generated__/meter-reading.json';

const toMeterRead = ({ serialNumber, date, value }: MeterReading): InsertMeterRead => ({
  serialNumber,
  date: date.toUTCString(),
  value: value.toString(),
});

export const meterReadsConsumer: EachMessageConsumer<MeterReading, Buffer, PgContext & LoggerContext> = async ({
  message,
  logger,
  db,
}) => {
  if (message.decodedValue) {
    logger.info('Meter read recieved', { value: message.decodedValue });
    await meterReadsInsertQuery(db, [toMeterRead(message.decodedValue)]);
  }
};
