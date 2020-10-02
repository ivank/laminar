import {
  App,
  jsonOk,
  httpServer,
  BodyParser,
  concatStream,
  defaultBodyParsers,
} from '@ovotech/laminar';
import * as YAML from 'yaml';

const app: App = ({ body }) => jsonOk(body);

const yamlParser: BodyParser = {
  match: (contentType) => contentType === 'application/yaml',
  /**
   * The data comes as a raw http.incommingMessage so we need to convert it to a string first
   * Some parsers could take advantage of this and use a streaming parser instead for added performance
   */
  parse: async (stream) => YAML.parse((await concatStream(stream)) ?? ''),
};

export const server = httpServer({
  app,
  port: 8899,
  hostname: 'localhost',

  /**
   * You can configure the request body parsers using `bodyParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers first
   */
  options: { bodyParsers: [...defaultBodyParsers, yamlParser] },
});
