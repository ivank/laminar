import { OapiConfig, openApi, HttpService, jsonOk, run } from '../../../src';
import axios from 'axios';
import { join } from 'path';

describe('Statements', () => {
  it('Should process response', async () => {
    const config: OapiConfig = {
      api: join(__dirname, 'statements.yaml'),
      paths: {
        '/accounts/{accountId}/meters': {
          get: async ({ query }) =>
            jsonOk([
              {
                bool: query.bool,
                int: query.int,
                num: query.num,
                objBool: query.obj.bool,
                objInt: query.obj.int,
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
                bool: query.bool,
                int: query.int,
                num: query.num,
                objBool: query.obj.bool,
                objInt: query.obj.int,
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
            ]),
        },
      },
    };

    const listener = await openApi(config);
    const http = new HttpService({ listener, port: 8064 });

    await run({ initOrder: [http] }, async () => {
      const api = axios.create({ baseURL: 'http://localhost:8064' });
      const { data } = await api.get('/accounts/123/meters?bool=true&obj[bool]=false&obj[int]=123&int=222&num=12.32');

      expect(data).toMatchSnapshot();
    });
  });
});
