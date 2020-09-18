import { Middleware, Response, response } from '@ovotech/laminar';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { compile, RuntimeOptions, TemplateDelegate } from 'handlebars';
import { join } from 'path';
import { OutgoingHttpHeaders } from 'http';

export interface TemplateConfig {
  helpers?: RuntimeOptions['helpers'];
  dir?: string;
  partials?: string;
  extension?: string;
  views?: string;
  headers?: OutgoingHttpHeaders;
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

export type HandlebarsRender = (
  view: string,
  data?: Record<string, unknown>,
  options?: Partial<Response>,
) => Response;

export interface RequestHandlebars {
  render: HandlebarsRender;
}

export const deepReaddirSync = (dir: string, childDir: string, parent = ''): string[] =>
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
    .filter((file) => file.endsWith(extension))
    .reduce((all, file) => {
      const name = file.slice(0, -(extension.length + 1));
      const input = readFileSync(join(dir, childDir, file), 'utf8');
      return { ...all, [name]: compile(input, compileOptions) };
    }, {});

export const handlebarsMiddleware = ({
  helpers = {},
  dir = process.cwd(),
  extension = 'handlebars',
  partials = 'partials',
  views = 'views',
  headers,
}: TemplateConfig): Middleware<RequestHandlebars> => {
  const defaultHeaders = { 'content-type': 'text/html', ...headers };

  const partialTemplates = existsSync(join(dir, partials))
    ? compileTemplates({ childDir: partials, dir, extension })
    : {};
  const viewTemplates = compileTemplates({ childDir: views, dir, extension });

  if (Object.keys(viewTemplates).length === 0) {
    throw new Error(`No templates with extension ${extension} found in ${join(dir, views)}`);
  }

  const render: HandlebarsRender = (view, data = {}, options = {}) =>
    response({
      body: viewTemplates[view](data, { helpers, partials: partialTemplates }),
      status: 200 as const,
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });

  return (next) => (req) => next({ ...req, render });
};
