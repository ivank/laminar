import { exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

describe('Example files', () => {
  it.each<[string, string]>([
    ['examples/simple.ts', `{ text: 'test', user: { email: 'test@example.com' } }`],
    // ['examples/petstore.ts', `INVENTORY`],
  ])('Should process %s', async (file, expected) => {
    const { stdout, stderr } = await promisify(exec)(`yarn ts-node ${file}`, {
      cwd: join(__dirname, '..'),
    });

    expect(stderr).toBe('');
    expect(stdout).toContain(expected);
  });
});
