import { Client } from 'pg';
import { id, fixture, setUp, tearDown, rel } from '@laminarjs/fixtures';

/**
 * Define the shape of the row we want to exist in the database
 */
const tariff = fixture('tariffs', {
  id,
  code: 'Tariff relation',
  type: 'Export',
  created_at: new Date('2020-01-01'),
  source_system_id: id,
});

/**
 * tariff id is a reference to the tariff object.
 * If we use the fixture reference, it will refer to the exact same row.
 */
const rate1 = fixture('tariff_rates', {
  id,
  tariff_id: rel(tariff, 'id'),
  rate: 10,
  start_date_on: new Date('2020-01-01'),
  end_date_on: new Date('2020-02-01'),
  created_at: new Date('2020-01-01'),
  source_system_id: id,
});

const rate2 = fixture('tariff_rates', {
  id,
  tariff_id: rel(tariff, 'id'),
  rate: 20,
  start_date_on: new Date('2020-02-01'),
  created_at: new Date('2020-01-01'),
  source_system_id: id,
});

const main = async () => {
  /**
   * Create database connection
   */
  const db = new Client({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
  await db.connect();

  /**
   * Run the fixtures
   */
  await setUp({ db, fixtures: [tariff, rate1, rate2] });

  const { rows: tariffs } = await db.query('SELECT * FROM tariffs WHERE code = $1', ['Tariff relation']);
  const { rows: rates } = await db.query(
    'SELECT tariff_rates.* FROM tariff_rates JOIN tariffs ON tariff_rates.tariff_id = tariffs.id WHERE code = $1 ORDER BY start_date_on ASC',
    ['Tariff relation'],
  );

  console.log(JSON.stringify(tariffs));
  console.log(JSON.stringify(rates));

  /**
   * Delete the rows created by setUp, and close the connection
   */
  await tearDown({ db, fixtures: [tariff, rate1, rate2] });
  await db.end();
};

main();
