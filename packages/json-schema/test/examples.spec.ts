import { exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

describe('Example files', () => {
  it.each<[string, string]>([
    ['examples/compile-urls.ts', `[ 'https://example.com/schema', 'https://example.com/color' ]`],
    ['examples/simple.ts', `false [ '[value] (format) should match email format' ]`],
    [
      'examples/validate-local-schema.ts',
      `validate false [ '[value] (enum) should be one of [red, green, blue]' ]`,
    ],
  ])('Should process %s', async (file, expected) => {
    const { stdout, stderr } = await promisify(exec)(`yarn ts-node ${file}`, {
      cwd: join(__dirname, '..'),
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(expected);
  });
});
