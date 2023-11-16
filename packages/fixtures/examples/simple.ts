import { Client } from 'pg';
import { id, fixture, setUp, tearDown, alternate } from '@laminarjs/fixtures';

/**
 * Define the shape of the row we want to exist in the database
 */
const tariff = fixture('tariffs', {
  id,
  code: 'Tariff simple',
  type: alternate('Generation', 'Export'),
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
  await setUp({ db, fixtures: [tariff] });

  const { rows } = await db.query('SELECT * FROM tariffs WHERE code = $1', ['Tariff simple']);

  console.log(JSON.stringify(rows));

  /**
   * Delete the rows created by setUp, and close the connection
   */
  await tearDown({ db, fixtures: [tariff] });
  await db.end();
};

main();
