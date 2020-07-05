import axios from 'axios';
import { axiosOapi } from './simple.types';
import * as nock from 'nock';

/**
 * Mock the simple rest api so we can test it out
 */
nock('http://simple.example.com')
  .get('/test/20')
  .reply(200, { text: 'test' })
  .post('/test/30')
  .reply(200, { text: 'test', user: { email: 'test@example.com' } });

/**
 * Wrap an axios instance. This will add typed functions with the name of the paths
 */
const simple = axiosOapi(axios.create({ baseURL: 'http://simple.example.com' }));

simple['GET /test/{id}']('20').then(({ data }) => console.log(data));

simple['POST /test/{id}']('30', { email: 'test2example.com' }).then(({ data }) =>
  console.log(data),
);
