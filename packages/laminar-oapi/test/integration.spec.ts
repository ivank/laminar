import { file, laminar, message, response } from '@ovotech/laminar';
import { format, isAfter, isBefore } from 'date-fns';
import { createServer, Server } from 'http';
import fetch from 'node-fetch';
import { join } from 'path';
import { oapi } from '../src';

let server: Server;

describe('Integration', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    const accounts: {
      [id: string]: {
        balance: number;
        date: Date;
        transactions: Array<{ type: string; amount: number; at: Date; cause: string }>;
      };
    } = {
      123: {
        balance: 100.12,
        date: new Date('2018-01-01'),
        transactions: [
          { type: 'TopUp', amount: 20, at: new Date('2018-01-01'), cause: 'From App' },
          {
            type: 'ElectricityUsageCharge',
            amount: -2,
            at: new Date('2018-01-03'),
            cause: 'From Meter',
          },
          {
            type: 'ElectricityStandingCharge',
            amount: -10,
            at: new Date('2018-01-03'),
            cause: 'From Meter',
          },
          {
            type: 'ElectricityUsageCharge',
            amount: -5,
            at: new Date('2018-01-04'),
            cause: 'From Meter',
          },
          {
            type: 'ElectricityStandingCharge',
            amount: -10,
            at: new Date('2018-01-04'),
            cause: 'From Meter',
          },
        ],
      },
    };

    const yamlFile = join(__dirname, 'swagger.yaml');
    const app = await oapi({
      yamlFile,
      paths: {
        '/internal/status': {
          get: () => response({ status: 200 }),
        },
        '/internal/swagger.yaml': {
          get: () => file(yamlFile),
        },
        '/api/v2/accounts/{accountId}/balance': {
          get: ({ path }) => {
            const account = accounts[path.accountId];
            return account
              ? {
                  balance: account.balance,
                  updatedAt: format(account.date, 'YYYY-MM-DDTHH:mm:ss[Z]'),
                  effectiveAt: format(account.date, 'YYYY-MM-DDTHH:mm:ss[Z]'),
                }
              : message(404, { message: 'Cannot Find Account' });
          },
        },
        '/api/v2/accounts/{accountId}/transactions': {
          get: ({ path, query }) => {
            const account = accounts[path.accountId];
            if (account) {
              const transactions = account.transactions
                .filter(({ type }) => !query!.transactionType || type === query!.transactionType)
                .filter(({ at }) => isAfter(at, query!.fromDate as string))
                .filter(({ at }) => isBefore(at, query!.toDate as string))
                .map(item => ({
                  transactionType: item.type,
                  amount: item.amount,
                  transactionDateTime: format(item.at, 'YYYY-MM-DDTHH:mm:ss[Z]'),
                  cause: item.cause,
                }));

              return { summary: { totalSize: transactions.length }, transactions };
            } else {
              return message(404, { message: 'Cannot Find Account' });
            }
          },
        },
      },
    });
    server = createServer(laminar(app));

    await new Promise(resolve => server.listen(8093, resolve));

    const status = await fetch('http://localhost:8093/internal/status');
    const swagger = await fetch('http://localhost:8093/internal/swagger.yaml');
    const unknownBalance = await fetch('http://localhost:8093/api/v2/accounts/1235/balance');
    const balance = await fetch('http://localhost:8093/api/v2/accounts/123/balance');
    const transError = await fetch('http://localhost:8093/api/v2/accounts/123/transactions');
    const trans = await fetch(
      'http://localhost:8093/api/v2/accounts/123/transactions?fromDate=2018-01-04&toDate=2020-01-01',
    );
    const topups = await fetch(
      'http://localhost:8093/api/v2/accounts/123/transactions?fromDate=2018-01-01&toDate=2020-01-01&transactionType=TopUp',
    );
    expect(status.status).toEqual(200);
    expect(await swagger.text()).toMatchSnapshot();
    expect(await unknownBalance.json()).toEqual({ message: 'Cannot Find Account' });
    expect(await balance.json()).toEqual({
      balance: 100.12,
      effectiveAt: '2018-01-01T02:00:00Z',
      updatedAt: '2018-01-01T02:00:00Z',
    });

    expect(await transError.json()).toEqual({
      message: 'Request Validation Error',
      errors: [
        '[context.query] is missing [fromDate] keys',
        '[context.query] is missing [toDate] keys',
      ],
    });

    expect(await trans.json()).toEqual({
      summary: {
        totalSize: 2,
      },
      transactions: [
        {
          amount: -5,
          cause: 'From Meter',
          transactionDateTime: '2018-01-04T02:00:00Z',
          transactionType: 'ElectricityUsageCharge',
        },
        {
          amount: -10,
          cause: 'From Meter',
          transactionDateTime: '2018-01-04T02:00:00Z',
          transactionType: 'ElectricityStandingCharge',
        },
      ],
    });
    expect(await topups.json()).toEqual({
      summary: {
        totalSize: 1,
      },
      transactions: [
        {
          amount: 20,
          cause: 'From App',
          transactionDateTime: '2018-01-01T02:00:00Z',
          transactionType: 'TopUp',
        },
      ],
    });
  });
});
