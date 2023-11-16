import { readdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fixturesCommand } from '../../../src/commands/fixtures';
import { ansiRegex } from '../../../src/helpers';

class Logger {
  public std = '';
  public err = '';

  public info(line: string): void {
    this.std += line.replace(ansiRegex, '') + '\n';
  }

  public error(line: string): void {
    this.err += line.replace(ansiRegex, '') + '\n';
  }

  public clear(): void {
    this.std = '';
    this.err = '';
  }
}

const logger = new Logger();
const generatedDir = join(__dirname, '__generated__');

describe('Cli', () => {
  beforeEach(() => {
    logger.clear();
    readdirSync(generatedDir)
      .filter((file) => file.endsWith('.ts'))
      .forEach((file) => unlinkSync(join(generatedDir, file)));
  });

  it('Should generate fixtures file', async () => {
    const input = `cmd fixtures postgres://example-admin:example-pass@localhost:5432/example --output ${generatedDir}/cli-fixtures.ts`;
    await fixturesCommand(logger).parseAsync(input.split(' '));

    const file = readFileSync(join(generatedDir, 'cli-fixtures.ts'), 'utf8');

    expect(file).toMatchSnapshot();
  });

  it('Should generate fixtures file with suffix and title case', async () => {
    const input = `cmd fixtures postgres://example-admin:example-pass@localhost:5432/example --suffix Fixture --title-case --output ${generatedDir}/cli-fixtures-suffix-title.ts`;
    await fixturesCommand(logger).parseAsync(input.split(' '));

    const file = readFileSync(join(generatedDir, 'cli-fixtures-suffix-title.ts'), 'utf8');

    expect(file).toMatchSnapshot();
  });
});
