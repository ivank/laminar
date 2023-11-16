import { BodyParser, defaultBodyParsers, HttpListener, HttpService, init, textOk } from '@laminar/laminar';

import { Transform, TransformCallback } from 'stream';

const listener: HttpListener = async ({ body }) => {
  const csvLinesToString = new Transform({
    writableObjectMode: true,
    transform: (lines: string[][], encoding, callback) => {
      callback(undefined, lines.map((line) => line.join('-')).join('|'));
    },
  });
  return textOk(body.pipe(csvLinesToString));
};

// << CustomStreamingBodyParser
class SimpleCsvTransform extends Transform {
  private lastLine = '';
  constructor() {
    super({ readableObjectMode: true });
  }
  _flush(callback: TransformCallback) {
    callback(undefined, [this.lastLine.split(',')]);
  }
  _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
    const lines = (this.lastLine + String(chunk)).split('\n');
    this.lastLine = lines.pop() ?? '';
    const csv = lines.map((line) => line.split(','));
    callback(undefined, csv);
  }
}

const csvStreamingParser: BodyParser = {
  name: 'SimpleCsvParser',
  match: /text\/csv/,
  parse: async (body) => {
    const csvTransform = new SimpleCsvTransform();
    return body.pipe(csvTransform);
  },
};

const service = new HttpService({
  bodyParsers: [csvStreamingParser, ...defaultBodyParsers],
  listener,
});

// CustomStreamingBodyParser

init({ initOrder: [service], logger: console });
