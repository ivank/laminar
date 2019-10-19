import { laminar, createBodyParser } from '@ovotech/laminar';
import axios from 'axios';
import { Server } from 'http';
import { join } from 'path';
import { createOapi } from '@ovotech/laminar-oapi';
import { Config } from './__generated__/statements';

let server: Server;

describe('Statements', () => {
  afterEach(() => new Promise(resolve => server.close(resolve)));

  it('Should process response', async () => {
    const config: Config = {
      api: join(__dirname, 'statements.yaml'),
      paths: {
        '/accounts/{accountId}/meters': {
          get: () => [
            {
              meterType: 'gas',
              mpxn: '111111111',
              plan: 'PA_G_WM_R_25',
              tariffName: 'SMART PAYG (all online)',
              startDate: '2019-01-04',
              endDate: '2019-06-02',
              msn: 'G4111111',
              ldz: 'WM',
              address: '87, TEST AVENUE, TEST TOWN',
              postCode: 'TT123EE',
            },
            {
              meterType: 'elec',
              mpxn: '14111111',
              plan: 'PA_E_14_R_1_25',
              tariffName: 'SMART PAYG (all online)',
              startDate: '2019-01-04',
              endDate: '2019-06-02',
              msn: '222222222',
              profileClassId: '01',
              meterTimeswitchCode: '801',
              lineLossFactorClassId: '1',
              address: '87, TEST AVENUE, LOW HILL, TEST TOWN, WEST MIDLANDS',
              postCode: 'TT123EE',
            },
          ],
        },
      },
    };

    const app = await createOapi(config);
    const bodyParser = createBodyParser();
    server = await laminar({ app: bodyParser(app), port: 8065 });

    const api = axios.create({ baseURL: 'http://localhost:8065' });
    const { data } = await api.get('/accounts/123/meters');

    expect(data).toMatchSnapshot();
  });
});
