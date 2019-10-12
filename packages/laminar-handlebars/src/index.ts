import { LaminarResponse, Middleware, response } from '@ovotech/laminar';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { compile, RuntimeOptions, TemplateDelegate } from 'handlebars';
import { join } from 'path';

export interface TemplateConfig {
  helpers?: RuntimeOptions['helpers'];
  dir?: string;
  partials?: string;
  extension?: string;
  views?: string;
  headers?: LaminarResponse['headers'];
}

export interface CompileTemplatesOptions {
  childDir: string;
  dir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compileOptions?: any;
  extension: string;
}

export interface Templates {
  [key: string]: TemplateDelegate;
}

export interface HandlebarsContext {
  render: (
    view: string,
    data?: {},
    responseOptions?: Partial<Pick<LaminarResponse, 'cookies' | 'headers' | 'status'>>,
  ) => LaminarResponse<string>;
}

export const deepReaddirSync = (dir: string, childDir: string, parent: string = ''): string[] =>
  readdirSync(join(dir, childDir), { withFileTypes: true }).reduce<string[]>(
    (all, item) =>
      item.isDirectory()
        ? [...all, ...deepReaddirSync(dir, join(childDir, item.name), join(parent, item.name))]
        : [...all, join(parent, item.name)],
    [],
  );

export const compileTemplates = ({
  childDir,
  dir,
  extension,
  compileOptions,
}: CompileTemplatesOptions): Templates =>
  deepReaddirSync(dir, childDir)
    .filter(file => file.endsWith(extension))
    .reduce((all, file) => {
      const name = file.slice(0, -(extension.length + 1));
      const input = readFileSync(join(dir, childDir, file), 'utf8');
      return { ...all, [name]: compile(input, compileOptions) };
    }, {});

export const createHandlebars = ({
  helpers = {},
  dir = process.cwd(),
  extension = 'handlebars',
  partials = 'partials',
  views = 'views',
  headers,
}: TemplateConfig): Middleware<HandlebarsContext> => {
  const defaultHeaders = { 'content-type': 'text/html' };

  const partialTemplates = existsSync(join(dir, partials))
    ? compileTemplates({ childDir: partials, dir, extension })
    : {};
  const viewTemplates = compileTemplates({ childDir: views, dir, extension });

  if (Object.keys(viewTemplates).length === 0) {
    throw new Error(`No templates with extension ${extension} found in ${join(dir, views)}`);
  }

  const render: HandlebarsContext['render'] = (view, data = {}, options = {}) => {
    return response({
      ...options,
      body: viewTemplates[view](data, { helpers, partials: partialTemplates }),
      headers: { ...defaultHeaders, ...headers, ...options.headers },
    });
  };

  return next => ctx => next({ ...ctx, render });
};
