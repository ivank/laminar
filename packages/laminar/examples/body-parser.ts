import { laminar, App, start, textOk, BodyParser, concatStream, defaultBodyParsers, describe } from '@ovotech/laminar';

const csvParser: BodyParser = {
  match: (contentType) => contentType === 'text/csv',
  parse: async (body) => String(await concatStream(body)).split(','),
};

const app: App = ({ body }) => textOk(JSON.stringify(body));

const server = laminar({
  port: 3333,
  app,
  options: { bodyParsers: [csvParser, ...defaultBodyParsers] },
});

start(server).then(() => console.log(describe(server)));
