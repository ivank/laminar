import { fixturesConvert } from '../../../src';

const tables = [
  {
    name: 'test',
    columns: [
      { name: 'id', type: 'integer', isNullable: false },
      { name: 'name', type: 'varchar', isNullable: true },
      { name: 'title', type: 'test_title', isNullable: false },
      { name: 'created_at', type: 'timestamp', isNullable: false },
      { name: 'updated_at', type: 'timestamp without time zone', isNullable: true },
      { name: 'end_on', type: 'date', isNullable: true },
      { name: 'is_active', type: 'boolean', isNullable: false },
    ],
  },
];

const enums = [{ name: 'test_title', enum: ['mr', 'mrs'] }];

describe('Fixtures ts test', () => {
  it('Should convert fixtures successfully', () => {
    expect(fixturesConvert({ tables, enums })).toMatchSnapshot('Normal');
    expect(fixturesConvert({ tables, enums, suffix: 'Fixture' })).toMatchSnapshot('Suffix');
    expect(fixturesConvert({ tables, enums, suffix: 'Fixture', titleCase: true })).toMatchSnapshot('TitleCase');
  });
});
