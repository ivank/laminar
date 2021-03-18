import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { avroExternalConvert, avroConvert } from '../../../src';

const avscFiles = readdirSync(join(__dirname, 'external-references')).filter((file) => file.endsWith('.avsc'));

describe('Avro ts test', () => {
  beforeAll(() => {
    readdirSync(join(__dirname, '__generated__'))
      .filter((file) => file.endsWith('.external.ts'))
      .forEach((file) => unlinkSync(join(__dirname, '__generated__', file)));
  });

  it('Should convert %s successfully', () => {
    const external = avscFiles.reduce(
      (acc, file) => ({
        ...acc,
        [`./${file}.external`]: avroExternalConvert(
          JSON.parse(String(readFileSync(join(__dirname, 'external-references', file)))),
        ),
      }),
      {},
    );

    for (const file of avscFiles) {
      const ts = avroConvert(JSON.parse(String(readFileSync(join(__dirname, 'external-references', file)))), {
        external,
      });
      writeFileSync(join(__dirname, '__generated__', file + '.external.ts'), ts);
      expect(ts).toMatchSnapshot(file);
    }
  });
});
