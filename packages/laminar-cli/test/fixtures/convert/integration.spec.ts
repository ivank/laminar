import { fixturesConvert } from '../../../src';

const tables = [
  {
    name: 'test',
    columns: [
      { name: 'id', type: 'integer', isOptional: false },
      { name: 'name', type: 'varchar', isOptional: true },
      { name: 'title', type: 'test_title', isOptional: false },
      { name: 'created_at', type: 'timestamp', isOptional: false },
      { name: 'updated_at', type: 'timestamp without time zone', isOptional: true },
      { name: 'end_on', type: 'date', isOptional: true },
      { name: 'is_active', type: 'boolean', isOptional: false },
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
