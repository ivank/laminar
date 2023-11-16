import { defaultResponseParsers, HttpService, response, ResponseParser, init } from '@laminar/laminar';

const listener = async () => response({ headers: { 'content-type': 'application/my-special-mime' }, body: [1, 2, 3] });

// << CustomResponseParser
const myParser: ResponseParser = {
  match: (contentType) => contentType === 'application/my-special-mime',
  parse: (body) => body.join(','),
};
// CustomResponseParser

// << responseParsers
const service = new HttpService({
  responseParsers: [myParser, ...defaultResponseParsers],
  listener,
});
// responseParsers

init({ initOrder: [service], logger: console });
