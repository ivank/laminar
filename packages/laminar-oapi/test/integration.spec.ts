import { file, HttpError, laminar, response } from '@ovotech/laminar';
import { format, isAfter, isBefore } from 'date-fns';
import { readFileSync } from 'fs';
import { createServer, Server } from 'http';
import fetch from 'node-fetch';
import { join } from 'path';
import { URLSearchParams } from 'url';
import { oapi } from '../src';

let server: Server;

describe('Integration', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    const rfcDate = 'YYYY-MM-DDTHH:mm:ss[Z]';
    const accounts: {
      [id: string]: {
        balance: {
          balance: number;
          updatedAt: string;
          effectiveAt: string;
        };
        transactions: Array<{
          transactionType: string;
          amount: number;
          transactionDateTime: string;
          cause: string;
        }>;
      };
    } = {
      123: {
        balance: {
          balance: 100.12,
          updatedAt: format('2018-01-01', rfcDate),
          effectiveAt: format('2018-01-01', rfcDate),
        },
        transactions: [
          {
            transactionType: 'TopUp',
            amount: 20,
            transactionDateTime: format('2018-01-01', rfcDate),
            cause: 'From App',
          },
          {
            transactionType: 'ElectricityUsageCharge',
            amount: -2,
            transactionDateTime: format('2018-01-03', rfcDate),
            cause: 'From Meter',
          },
          {
            transactionType: 'ElectricityStandingCharge',
            amount: -10,
            transactionDateTime: format('2018-01-03', rfcDate),
            cause: 'From Meter',
          },
          {
            transactionType: 'ElectricityUsageCharge',
            amount: -5,
            transactionDateTime: format('2018-01-04', rfcDate),
            cause: 'From Meter',
          },
          {
            transactionType: 'ElectricityStandingCharge',
            amount: -10,
            transactionDateTime: format('2018-01-04', rfcDate),
            cause: 'From Meter',
          },
        ],
      },
    };

    const getAccount = (id: string) => {
      if (!accounts[id]) {
        throw new HttpError(404, { message: 'Cannot Find Account' });
      }
      return accounts[id];
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
          get: ({ path }) => getAccount(path.accountId).balance,
        },
        '/api/v2/accounts/{accountId}/adjust-balance': {
          post: ({ path, body }) => {
            const account = getAccount(path.accountId);
            const { amount, transactionDateTime, cause } = body;
            account.balance.balance = account.balance.balance + amount;
            account.balance.updatedAt = transactionDateTime;
            account.balance.effectiveAt = transactionDateTime;
            account.transactions.push({
              transactionType: 'BalanceAdjustment',
              amount,
              transactionDateTime,
              cause,
            });

            return account.balance;
          },
        },
        '/api/v2/accounts/{accountId}/transactions': {
          get: ({ path, query }) => {
            const account = getAccount(path.accountId);
            const transactions = account.transactions
              .filter(
                ({ transactionType }) =>
                  !query!.transactionType || query!.transactionType.includes(transactionType),
              )
              .filter(({ transactionDateTime }) =>
                isAfter(transactionDateTime, query!.fromDate as string),
              )
              .filter(({ transactionDateTime }) =>
                isBefore(transactionDateTime, query!.toDate as string),
              );

            return { summary: { totalSize: transactions.length }, transactions };
          },
        },
      },
    });
    server = createServer(laminar(app));

    await new Promise(resolve => server.listen(8093, resolve));

    const baseUrl = 'http://localhost:8093';

    const status = await fetch(`${baseUrl}/internal/status`);
    const swagger = await fetch(`${baseUrl}/internal/swagger.yaml`);
    const unknownBalance = await fetch(`${baseUrl}/api/v2/accounts/1235/balance`);
    const balance = await fetch(`${baseUrl}/api/v2/accounts/123/balance`);
    const transError = await fetch(`${baseUrl}/api/v2/accounts/123/transactions`);
    const trans = await fetch(
      `${baseUrl}/api/v2/accounts/123/transactions?` +
        new URLSearchParams({ fromDate: '2018-01-04', toDate: '2020-01-01' }).toString(),
    );
    const topups = await fetch(
      `${baseUrl}/api/v2/accounts/123/transactions?` +
        new URLSearchParams({
          fromDate: '2018-01-01',
          toDate: '2020-01-01',
          'transactionType[]': 'TopUp',
        }).toString(),
    );

    const update = await fetch(`${baseUrl}/api/v2/accounts/123/adjust-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: '123',
        cause: 'Goodwill',
        amount: 10,
        transactionDateTime: '2018-01-06T00:00:00Z',
      }),
    });

    const updatedBalance = await fetch(`${baseUrl}/api/v2/accounts/123/balance`);
    const updatedTrans = await fetch(
      `${baseUrl}/api/v2/accounts/123/transactions?` +
        new URLSearchParams({
          fromDate: '2018-01-01',
          toDate: '2020-01-01',
          transactionType: ['TopUp', 'BalanceAdjustment'],
        }),
    );

    expect(status.status).toEqual(200);
    expect(await swagger.text()).toEqual(String(readFileSync(yamlFile)));
    expect(await unknownBalance.json()).toEqual({ message: 'Cannot Find Account' });
    expect(await balance.json()).toEqual({
      balance: 100.12,
      effectiveAt: '2018-01-01T00:00:00Z',
      updatedAt: '2018-01-01T00:00:00Z',
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
          transactionDateTime: '2018-01-04T00:00:00Z',
          transactionType: 'ElectricityUsageCharge',
        },
        {
          amount: -10,
          cause: 'From Meter',
          transactionDateTime: '2018-01-04T00:00:00Z',
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
          transactionDateTime: '2018-01-01T00:00:00Z',
          transactionType: 'TopUp',
        },
      ],
    });

    expect(await update.json()).toEqual({
      balance: 110.12,
      effectiveAt: '2018-01-06T00:00:00Z',
      updatedAt: '2018-01-06T00:00:00Z',
    });

    expect(await updatedBalance.json()).toEqual({
      balance: 110.12,
      effectiveAt: '2018-01-06T00:00:00Z',
      updatedAt: '2018-01-06T00:00:00Z',
    });

    expect(await updatedTrans.json()).toEqual({
      summary: {
        totalSize: 2,
      },
      transactions: [
        {
          amount: 20,
          cause: 'From App',
          transactionDateTime: '2018-01-01T00:00:00Z',
          transactionType: 'TopUp',
        },
        {
          amount: 10,
          cause: 'Goodwill',
          transactionDateTime: '2018-01-06T00:00:00Z',
          transactionType: 'BalanceAdjustment',
        },
      ],
    });
  });
});
