import { join } from 'path';
import { compileTemplates, deepReaddirSync } from '../src';

const dir = join(__dirname, 'root');

describe('Laminar Handlebars', () => {
  it('Test deepReaddirSync', () => {
    const partials = deepReaddirSync({ dir: join(dir, 'partials'), extension: 'handlebars' });

    expect(partials).toEqual([
      join(dir, 'partials/inner/condition.handlebars'),
      join(dir, 'partials/inner/deep/unless.handlebars'),
      join(dir, 'partials/layout.handlebars'),
      join(dir, 'partials/list.handlebars'),
      join(dir, 'partials/span.handlebars'),
    ]);
  });

  it('Test compileTemplates', () => {
    const partials = compileTemplates({ dir: join(dir, 'partials'), extension: 'handlebars' });

    expect(partials.find(([name]) => name === 'list')?.[1]({ list: ['one', 'two'] })).toMatchSnapshot();
    expect(partials.find(([name]) => name === 'span')?.[1]({ text: 'example' })).toMatchSnapshot();
    expect(partials.find(([name]) => name === 'inner/condition')?.[1]({ test: true })).toMatchSnapshot();
    expect(partials.find(([name]) => name === 'inner/deep/unless')?.[1]({})).toMatchSnapshot();
  });
});
