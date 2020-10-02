import {
  App,
  yaml,
  ok,
  httpServer,
  ResponseParser,
  defaultResponseParsers,
} from '@ovotech/laminar';
import * as YAML from 'yaml';

const app: App = () => yaml(ok({ body: { example: { test: 'msg' } } }));

const yamlParser: ResponseParser = {
  match: (contentType) => contentType === 'application/yaml',
  parse: (yaml) => YAML.stringify(yaml),
};

export const server = httpServer({
  app,
  port: 8898,
  hostname: 'localhost',
  /**
   * You can configure the response parsers using `responseParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers first
   */
  options: { responseParsers: [...defaultResponseParsers, yamlParser] },
});
