import { HttpListener, yaml, ok, HttpService, ResponseParser, defaultResponseParsers, init } from '@ovotech/laminar';

// << app

import * as YAML from 'yaml';

const listener: HttpListener = async () => yaml(ok({ body: { example: { test: 'msg' } } }));

const yamlParser: ResponseParser = {
  match: (contentType) => contentType === 'application/yaml',
  parse: (yaml) => YAML.stringify(yaml),
};

const http = new HttpService({
  listener,
  /**
   * You can configure the response parsers using `responseParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers first
   */
  responseParsers: [...defaultResponseParsers, yamlParser],
});

// app

init({ initOrder: [http], logger: console });
