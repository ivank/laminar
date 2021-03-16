import {
  HttpListener,
  jsonOk,
  HttpService,
  BodyParser,
  concatStream,
  defaultBodyParsers,
  init,
} from '@ovotech/laminar';

// << app
import * as YAML from 'yaml';

const listener: HttpListener = async ({ body }) => jsonOk(body);

const yamlParser: BodyParser = {
  name: 'YamlParser',
  match: (contentType) => contentType === 'application/yaml',
  /**
   * The data comes as a raw http.incommingMessage so we need to convert it to a string first
   * Some parsers could take advantage of this and use a streaming parser instead for added performance
   */
  parse: async (stream) => YAML.parse((await concatStream(stream)) ?? ''),
};

const http = new HttpService({
  listener,
  /**
   * You can configure the request body parsers using `bodyParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers too
   */
  bodyParsers: [yamlParser, ...defaultBodyParsers],
});

// app

init({ services: [http], logger: console });
