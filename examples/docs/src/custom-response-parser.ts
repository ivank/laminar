import { App, yaml, ok, httpServer, ResponseParser, defaultResponseParsers, start, describe } from '@ovotech/laminar';

// << app

import * as YAML from 'yaml';

const app: App = () => yaml(ok({ body: { example: { test: 'msg' } } }));

const yamlParser: ResponseParser = {
  match: (contentType) => contentType === 'application/yaml',
  parse: (yaml) => YAML.stringify(yaml),
};

const server = httpServer({
  app,
  /**
   * You can configure the response parsers using `responseParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers first
   */
  options: { responseParsers: [...defaultResponseParsers, yamlParser] },
});

// app

start(server).then((http) => console.log(describe(http)));
