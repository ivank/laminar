import * as packageJson from '../../package.json';
import { laminarCommand } from '../../src/commands/laminar';

describe('Version', () => {
  it('Should have the correct version', async () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn() };

    await expect(
      laminarCommand(logger).exitOverride().parseAsync(['node', 'laminar', '--version']),
    ).rejects.toMatchObject({
      name: 'CommanderError',
      message: packageJson.version,
    });
  });
});
