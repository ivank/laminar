import { join } from 'path';
import { compileTemplates, deepReaddirSync } from '../src';

const rootDir = join(__dirname, 'root');

describe('Laminar Handlebars', () => {
  it('Test deepReaddirSync', () => {
    const partials = deepReaddirSync(rootDir, 'partials');

    expect(partials).toEqual([
      'inner/condition.handlebars',
      'inner/deep/unless.handlebars',
      'layout.handlebars',
      'list.handlebars',
      'span.handlebars',
    ]);
  });

  it('Test compileTemplates', () => {
    const partials = compileTemplates('partials', { rootDir, extension: 'handlebars' });

    expect(partials.list({ list: ['one', 'two'] })).toMatchSnapshot();
    expect(partials.span({ text: 'example' })).toMatchSnapshot();
    expect(partials['inner/condition']({ test: true })).toMatchSnapshot();
    expect(partials['inner/deep/unless']({})).toMatchSnapshot();
  });
});
