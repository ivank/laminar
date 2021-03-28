import { schema } from 'avsc';
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { avroConvert } from '../../../src';

const avroDir = join(__dirname, '../avro');
const avscFiles = readdirSync(avroDir);

describe('Avro ts test', () => {
  beforeAll(() => {
    readdirSync(join(__dirname, '__generated__'))
      .filter((file) => file.endsWith('.ts'))
      .forEach((file) => unlinkSync(join(__dirname, '__generated__', file)));
  });

  it.each(avscFiles)('Should convert %s successfully', (file) => {
    const avro: schema.RecordType = JSON.parse(String(readFileSync(join(avroDir, file))));
    const ts = avroConvert(avro, {
      logicalTypes: {
        'timestamp-millis': { module: 'moment', named: 'Moment' },
        date: 'string',
        decimal: { module: 'decimal.js', named: 'Decimal' },
      },
    });
    writeFileSync(join(__dirname, '__generated__', file + '.ts'), ts);
    expect(ts).toMatchSnapshot();
  });

  it.each(avscFiles)('Should convert %s successfully with default as optional', (file) => {
    const avro: schema.RecordType = JSON.parse(String(readFileSync(join(avroDir, file))));
    const ts = avroConvert(avro, {
      logicalTypes: {
        'timestamp-millis': { module: 'moment', named: 'Moment' },
        date: 'string',
        decimal: { module: 'decimal.js', named: 'Decimal' },
      },
      defaultsAsOptional: true,
    });
    writeFileSync(join(__dirname, '__generated__', file + '.ts'), ts);
    expect(ts).toMatchSnapshot();
  });
});
