import {
  BodyParser,
  concatStream,
  defaultBodyParsers,
  HttpListener,
  HttpService,
  init,
  jsonOk,
} from '@ovotech/laminar';

const listener: HttpListener = async ({ body }) => jsonOk({ ok: true, body });

// << CustomBodyParser
const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => {
    const csv = await concatStream(body);
    return csv?.split('\n').map((line) => line.split(','));
  },
};
// CustomBodyParser

// << bodyParsers
const service = new HttpService({
  bodyParsers: [csvParser, ...defaultBodyParsers],
  listener,
});
// bodyParsers

init({ initOrder: [service], logger: console });
