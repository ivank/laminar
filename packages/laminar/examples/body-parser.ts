import {
  HttpService,
  HttpListener,
  textOk,
  BodyParser,
  concatStream,
  defaultBodyParsers,
  init,
} from '@laminarjs/laminar';

const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => String(await concatStream(body)).split(','),
};

const listener: HttpListener = async ({ body }) => textOk(JSON.stringify(body));

const http = new HttpService({
  listener,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

init({ initOrder: [http], logger: console });
