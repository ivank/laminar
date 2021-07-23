# Laminar Fixtures

SQL Fixtures for generating data in a database for PG.
Statically resolves relational ids _before_ they are saved to the database.

### Usage

> [examples/simple.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-fixtures/examples/simple.ts)

```typescript
import { Client } from 'pg';
import { id, fixture, setUp, tearDown, alternate } from '@ovotech/laminar-fixtures';

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
```

### API

Fixture columns

You can use constants - number, string, Date, null. You can also use a function that will accept the current id as argument

```typescript
import { fixture } from '@laminar/laminar-fixtures';
const myFixture = fixture('mytable', { name: (id) => `Name ${id}` });

console.log(generate([myFixture]));
// would output
[{ table: 'mytable', columns: { name: `Name 1` } }];
```

Additionally there are a number of helpers to build columns with:

#### id

Directly return the current entity id. Useful for table serial primary keys

```typescript
import { fixture, id, generate } from '@laminar/laminar-fixtures';
const myFixture = fixture('mytable', { id });

console.log(generate([myFixture]));
// would output
[{ table: 'mytable', columns: { id: 1 } }];
```

#### template

Generate a column value using the current entity id.

```typescript
import { fixture, template, generate } from '@laminar/laminar-fixtures';
const myFixture = fixture('mytable', { name: template('My column %s') });

console.log(generate([myFixture]));
// would output
[{ table: 'mytable', columns: { name: 'My column 1' } }];
```

#### rel

Get a column from another fixture. We create a map of dependencies, so that if you link another fixture, it will create it first, and then use its columns to get the value.

```typescript
import { fixture, id, rel, generate } from '@laminar/laminar-fixtures';
const parent = fixture('parents', { id });
const child = fixture('children', {
  id,
  parent_id: rel(parent, 'id');
});

console.log(generate([child]));
// would output
[
  { table: 'parents', columns: { id: 1 } },
  { table: 'children', columns: { id: 1, parent_id: 1 } },
]
```

#### alternate

Switch between multiple variants of a column, depending on the id.

```typescript
import { fixture, alternate, multiFixture, generate } from '@laminar/laminar-fixtures';
const myFixture = fixture('mytable', { type: alternate('Generation', 'Export') });

console.log(generate(multiFixture(2, myFixture)));
// would output
[
  { table: 'mytable', columns: { type: 'Generation' } },
  { table: 'mytable', columns: { type: 'Export' } },
];
```

### Relations

You can define fixtures that defend on one another. Laminar-fixtures will try to have only one instance of a fixutre, and if you use it someplace in a relationship, only that one entity would be referenced.

If you want to clone the fixture and use a different version of it, you can also use `fixtureClone`

> [examples/relations.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-fixtures/examples/relations.ts)

```typescript
import { Client } from 'pg';
import { id, fixture, setUp, tearDown, rel } from '@ovotech/laminar-fixtures';

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
```

### Multi Fixtuers

You can create multiple rows by using `multiFixture`, and clone a fixture with `cloneFixture`. Details explained below:

> [examples/multi.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-fixtures/examples/multi.ts)

```typescript
import { Client } from 'pg';
import {
  id,
  fixture,
  setUp,
  tearDown,
  rel,
  cloneFixture,
  multiFixture,
  alternate,
  template,
} from '@ovotech/laminar-fixtures';

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
```

## Running the tests

You can run the tests with:

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is preferment by yarn automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](https://github.com/ovotech/laminar/tree/main/packages/laminar-fixtures/test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](https://github.com/ovotech/laminar/tree/main/packages/laminar-fixtures/LICENSE) file for details
