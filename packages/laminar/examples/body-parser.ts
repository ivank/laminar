import {
  createLaminar,
  Resolver,
  Context,
  createBodyParser,
  defaultParsers,
  BodyParser,
  concatStream,
} from '@ovotech/laminar';

const csvParser: BodyParser = {
  match: contentType => contentType === 'text/csv',
  parse: async body => String(await concatStream(body)).split(','),
};

const bodyParser = createBodyParser([csvParser, ...defaultParsers]);

const main: Resolver<Context> = ctx => ctx.body;
createLaminar({ port: 3333, app: bodyParser(main) }).start();
