/* eslint-disable @typescript-eslint/no-explicit-any */

import { LaminarResponse, Middleware, response } from '@ovotech/laminar';
import { readdirSync, readFileSync } from 'fs';
import { compile, RuntimeOptions, TemplateDelegate } from 'handlebars';
import { join } from 'path';

export interface TemplateConfig {
  helpers?: RuntimeOptions['helpers'];
  rootDir?: string;
  partialsDir?: string;
  extension?: string;
  viewsDir?: string;
  headers?: LaminarResponse['headers'];
}

export interface CompileTemplatesOptions {
  rootDir: string;
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

export const deepReaddirSync = (rootDir: string, dir: string, parent: string = ''): string[] =>
  readdirSync(join(rootDir, dir), { withFileTypes: true }).reduce<string[]>(
    (all, item) =>
      item.isDirectory()
        ? [...all, ...deepReaddirSync(rootDir, join(dir, item.name), join(parent, item.name))]
        : [...all, join(parent, item.name)],
    [],
  );

export const compileTemplates = (
  dir: string,
  { rootDir, extension, compileOptions }: CompileTemplatesOptions,
): Templates =>
  deepReaddirSync(rootDir, dir)
    .filter(file => file.endsWith(extension))
    .reduce((all, file) => {
      const name = file.slice(0, -(extension.length + 1));
      const input = readFileSync(join(rootDir, dir, file), 'utf8');
      return { ...all, [name]: compile(input, compileOptions) };
    }, {});

export const withHandlebars = ({
  helpers = {},
  rootDir = process.cwd(),
  extension = 'handlebars',
  partialsDir = './partials',
  viewsDir = './views',
  headers,
}: TemplateConfig): Middleware<HandlebarsContext> => {
  const defaultHeaders = { 'content-type': 'text/html' };

  const partials = compileTemplates(partialsDir, { rootDir, extension });
  const views = compileTemplates(viewsDir, { rootDir, extension });

  const render: HandlebarsContext['render'] = (view, data = {}, options = {}) => {
    return response({
      ...options,
      body: views[view](data, { helpers, partials }),
      headers: { ...defaultHeaders, ...headers, ...options.headers },
    });
  };

  return resolver => {
    return ctx => resolver({ ...ctx, render });
  };
};
