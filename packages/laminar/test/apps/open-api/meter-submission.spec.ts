import { OapiConfig, openApi, HttpService, run, htmlOk } from '../../../src';
import axios, { AxiosError } from 'axios';
import { join } from 'path';
import { LoggerContext, withLogger } from './middleware/logger';
import { inspect } from 'util';
import { URLSearchParams } from 'url';

interface Reading {
  meterId: number;
  date: Date;
  value: number;
}

const isAxiosError = (object: unknown): object is AxiosError =>
  typeof object === 'object' && object !== null && 'response' in object;

describe('HTML Integration', () => {
  it('Should process response', async () => {
    const readings: Reading[] = [
      { meterId: 1, date: new Date('2021-01-10'), value: 10 },
      { meterId: 2, date: new Date('2021-01-05'), value: 5 },
    ];
    const log = jest.fn();

    const config: OapiConfig<LoggerContext> = {
      api: join(__dirname, 'meter-submission.yaml'),
      paths: {
        '/meters': { get: async () => htmlOk('<html>METERS</html>') },
        '/meters/{id}/reading': {
          get: async ({ logger, path: { id } }) => {
            logger('Get all');
            return htmlOk(
              `<html>${readings
                .filter((reading) => reading.meterId === id)
                .map((reading) => JSON.stringify(reading))
                .join(', ')}</html>`,
            );
          },
          post: async ({ body, path: { id }, logger }) => {
            const reading: Reading = { meterId: id, date: body.date, value: body.value };
            logger(`Add ${JSON.stringify(reading)}`);
            readings.push(reading);
            return htmlOk(`<html>Added ${JSON.stringify(reading)}</html>`);
          },
        },
      },
    };

    const oapi = await openApi(config);
    const logger = withLogger(log);

    const http = new HttpService({ listener: logger(oapi), port: 8063 });

    await run({ initOrder: [http] }, async () => {
      try {
        const api = axios.create({ baseURL: 'http://localhost:8063' });

        expect(await api.get('/meters')).toMatchObject({ status: 200, data: '<html>METERS</html>' });

        expect(await api.get('/meters/2/reading')).toMatchObject({
          status: 200,
          data: '<html>{"meterId":2,"date":"2021-01-05T00:00:00.000Z","value":5}</html>',
        });

        await api.post('/meters/2/reading', new URLSearchParams({ date: '2021-01-10', value: '12' }));

        expect(await api.get('/meters/2/reading')).toMatchObject({
          status: 200,
          data: '<html>{"meterId":2,"date":"2021-01-05T00:00:00.000Z","value":5}, {"meterId":2,"date":"2021-01-10T00:00:00.000Z","value":12}</html>',
        });
      } catch (error) {
        if (isAxiosError(error)) {
          console.error(inspect(error?.response?.data, { depth: 10, colors: true }));
        }
        throw error;
      }
    });
  });
});
