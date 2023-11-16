import { Client } from 'pg';
import { id, fixture, setUp, tearDown, rel, cloneFixture, multiFixture, alternate, template } from '@laminar/fixtures';

/**
 * Use the multi fixture directly to create 2 independent tariffs.
 * - alternate to switch between export and generation
 * - tmeplate to create unique string based on id
 */
const tariff = fixture('tariffs', {
  id,
  code: template('Tariff multi %s'),
  type: alternate('Export', 'Generation'),
  created_at: new Date('2020-01-01'),
  source_system_id: id,
});

const [exportTariff, generationTariff] = multiFixture(2, tariff);

/**
 * A rate that changes every month
 */
const exportRaterate = fixture('tariff_rates', {
  id,
  tariff_id: rel(exportTariff, 'id'),
  rate: (id) => id * 10,
  start_date_on: (id) => new Date(2020, id - 1, 1),
  end_date_on: (id) => new Date(2020, id, 0),
  created_at: new Date('2020-01-01'),
  source_system_id: id,
});

/**
 * Clone the rate, but use a different tariff for it
 */
const generationRaterate = cloneFixture(exportRaterate, {
  columns: {
    tariff_id: rel(generationTariff, 'id'),
  },
});

const fixtures = multiFixture(5, exportRaterate).concat(multiFixture(5, generationRaterate));

const main = async () => {
  /**
   * Create database connection
   */
  const db = new Client({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
  await db.connect();

  /**
   * Run the fixtures. Since rates depend on tariffs, the tariff will be created as well
   */
  await setUp({ db, fixtures });

  const { rows: tariffs } = await db.query('SELECT * FROM tariffs WHERE code IN ($1,$2)', [
    'Tariff multi 1',
    'Tariff multi 2',
  ]);
  const { rows: rates } = await db.query(
    'SELECT tariff_rates.* FROM tariff_rates JOIN tariffs ON tariff_rates.tariff_id = tariffs.id WHERE code IN ($1,$2) ORDER BY start_date_on ASC',
    ['Tariff multi 1', 'Tariff multi 2'],
  );

  console.log(JSON.stringify(tariffs));
  console.log(JSON.stringify(rates));

  await tearDown({ db, fixtures });
  await db.end();
};

main();
