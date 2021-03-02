import { exec, execSync } from 'child_process';
import { readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const examplesDir = join(__dirname, '../examples/');

describe('Example files', () => {
  beforeAll(() => execSync('yarn tsc', { cwd: examplesDir }));
  afterAll(() =>
    readdirSync(examplesDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, file))),
  );

  it.each<[string, string]>([
    ['examples/compile-urls.ts', `[ 'https://example.com/schema', 'https://example.com/color' ]`],
    ['examples/simple.ts', `false [ '[value] (format) should match email format' ]`],
    ['examples/validate-local-schema.ts', `validate false [ '[value] (enum) should be one of [red, green, blue]' ]`],
  ])('Should process %s', async (file, expected) => {
    const { stdout, stderr } = await promisify(exec)(`yarn node ${file.replace('.ts', '.js')}`, {
      cwd: join(__dirname, '..'),
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(expected);
  });
});
