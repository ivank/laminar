import { execSync } from 'child_process';
import { readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const examplesDir = join(__dirname, '../examples/');

describe('Example files', () => {
  beforeAll(() => execSync('yarn tsc', { cwd: examplesDir }));
  afterAll(() =>
    readdirSync(examplesDir)
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => unlinkSync(join(examplesDir, file))),
  );

  it.each<[string, string]>([
    [
      'examples/simple.ts',
      `${JSON.stringify([
        {
          id: 1,
          code: 'Tariff simple',
          type: 'Generation',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 1,
        },
      ])}\n`,
    ],
    [
      'examples/relations.ts',
      `${JSON.stringify([
        {
          id: 1,
          code: 'Tariff relation',
          type: 'Export',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 1,
        },
      ])}\n${JSON.stringify([
        {
          id: 1,
          tariff_id: 1,
          rate: '10',
          start_date_on: '2020-01-01T00:00:00.000Z',
          end_date_on: '2020-02-01T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 1,
        },
        {
          id: 2,
          tariff_id: 1,
          rate: '20',
          start_date_on: '2020-02-01T00:00:00.000Z',
          end_date_on: null,
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 2,
        },
      ])}\n`,
    ],
    [
      'examples/multi.ts',
      `${JSON.stringify([
        {
          id: 1,
          code: 'Tariff multi 1',
          type: 'Export',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 1,
        },
        {
          id: 2,
          code: 'Tariff multi 2',
          type: 'Generation',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 2,
        },
      ])}\n${JSON.stringify([
        {
          id: 1,
          tariff_id: 1,
          rate: '10',
          start_date_on: '2020-01-01T00:00:00.000Z',
          end_date_on: '2020-01-31T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 1,
        },
        {
          id: 2,
          tariff_id: 1,
          rate: '20',
          start_date_on: '2020-02-01T00:00:00.000Z',
          end_date_on: '2020-02-29T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 2,
        },
        {
          id: 3,
          tariff_id: 1,
          rate: '30',
          start_date_on: '2020-03-01T00:00:00.000Z',
          end_date_on: '2020-03-31T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 3,
        },
        {
          id: 4,
          tariff_id: 1,
          rate: '40',
          start_date_on: '2020-04-01T00:00:00.000Z',
          end_date_on: '2020-04-30T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 4,
        },
        {
          id: 5,
          tariff_id: 1,
          rate: '50',
          start_date_on: '2020-05-01T00:00:00.000Z',
          end_date_on: '2020-05-31T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 5,
        },
        {
          id: 6,
          tariff_id: 2,
          rate: '60',
          start_date_on: '2020-06-01T00:00:00.000Z',
          end_date_on: '2020-06-30T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 6,
        },
        {
          id: 7,
          tariff_id: 2,
          rate: '70',
          start_date_on: '2020-07-01T00:00:00.000Z',
          end_date_on: '2020-07-31T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 7,
        },
        {
          id: 8,
          tariff_id: 2,
          rate: '80',
          start_date_on: '2020-08-01T00:00:00.000Z',
          end_date_on: '2020-08-31T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 8,
        },
        {
          id: 9,
          tariff_id: 2,
          rate: '90',
          start_date_on: '2020-09-01T00:00:00.000Z',
          end_date_on: '2020-09-30T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 9,
        },
        {
          id: 10,
          tariff_id: 2,
          rate: '100',
          start_date_on: '2020-10-01T00:00:00.000Z',
          end_date_on: '2020-10-31T00:00:00.000Z',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: null,
          source_system_id: 10,
        },
      ])}\n`,
    ],
  ])('Should process %s', async (file, expected) => {
    const result = execSync(`yarn node ${file.replace('.ts', '.js')}`, {
      cwd: join(__dirname, '..'),
      env: { ...process.env, TZ: 'UTC' },
    });

    expect(result.toString()).toEqual(expected);
  });
});
