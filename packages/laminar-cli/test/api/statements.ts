import { StatementData, StatementDataModification } from './__generated__/statements';
import { Readable } from 'stream';
import { readFileSync } from 'fs';
import { join } from 'path';

export class StatementService {
  private db: StatementData[];
  constructor() {
    this.db = [
      {
        id: '111',
        ref: 'REF111',
        state: 'CREATED',
        account: { id: '1', transactions: [] },
        supplies: [],
      },
      {
        id: '222',
        ref: 'REF222',
        state: 'IDENTIFICATION_COMPLETED',
        account: { id: '2', transactions: [] },
        supplies: [],
      },
      {
        id: '333',
        ref: 'REF333',
        state: 'GATHERING_DATA_COMPLETED',
        account: {
          id: '3',
          globalId: 'G3',
          lossType: 'SupplyLoss',
          address: {
            firstName: 'John',
            lastName: 'Doe',
            address: 'Street 1',
            postcode: 'BGT 333',
            town: 'BigTown',
          },
          transactions: [
            { id: '1', type: 'Old', date: '2020-01-01', amount: 10, description: 'Old 10' },
          ],
        },
        supplies: [
          {
            type: 'gas',
            mpxn: '11',
            service: { from: '2019-01-01', to: '2020-01-01' },
            ownership: { from: '2019-01-01', to: '2020-01-01' },
            flows: [{ msn: '1', date: '2020-01-01', type: 'MBR', value: 10, details: 'MBR 1' }],
            projection: { from: '2020-01-01', source: 'Older', value: 20 },
            msds: [],
            rates: [
              {
                dates: { from: '2019-01-01', to: '2020-01-01' },
                plan: 'Cheap',
                unit: 10,
                standing: 10,
              },
            ],
            transactions: [
              {
                id: '1',
                msn: '111',
                type: 'S2',
                date: '2020-01-01',
                amount: 10,
                description: 'Old 10',
              },
            ],
          },
        ],
      },
      {
        id: '444',
        ref: 'REF444',
        state: 'COMPLETED',
        pdf: true,
        html: true,
        comm: { id: 'COM444', sentAt: '2020-02-01', status: 'Delivered' },
        account: {
          id: '3',
          globalId: 'G3',
          lossType: 'SupplyLoss',
          address: {
            firstName: 'John',
            lastName: 'Doe',
            address: 'Street 1',
            postcode: 'BGT 444',
            town: 'BigTown',
          },
          transactions: [
            { id: '2', type: 'Finance', date: '2020-01-01', amount: 10, description: 'Finance 10' },
            { id: '3', type: 'Bit', date: '2020-01-02', amount: 5, description: 'Bit 10' },
          ],
        },
        supplies: [
          {
            type: 'elec',
            mpxn: '11',
            service: { from: '2019-01-01', to: '2020-01-01' },
            ownership: { from: '2019-01-01', to: '2020-01-01' },
            flows: [
              {
                msn: '1',
                date: '2020-01-01',
                type: 'D86',
                registers: [{ id: '1', value: 10 }],
                details: 'D86 1',
              },
            ],
            projection: { from: '2020-01-01', source: 'Older', value: 20 },
            msds: [],
            rates: [
              {
                dates: { from: '2019-01-01', to: '2020-01-01' },
                plan: 'Expensive',
                unit: 20,
                standing: 20,
              },
            ],
            transactions: [
              {
                id: '1',
                msn: '111',
                type: 'D188',
                date: '2020-01-01',
                amount: 10,
                description: 'D188 10',
              },
            ],
          },
        ],
      },
    ];
  }

  getAll(): StatementData[] {
    return this.db;
  }

  get(id: string): StatementData | undefined {
    return this.db.find((item) => item.id === id);
  }

  html(id: string): Readable | undefined {
    const item = this.get(id);
    return item ? Readable.from(['<html>', item.ref, '</html>']) : undefined;
  }

  pdf(id: string): Promise<Buffer | undefined> {
    const item = this.get(id);
    if (!item) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve(readFileSync(join(__dirname, './test.pdf')));
  }

  add(data: StatementData): StatementData {
    this.db.push(data);
    return data;
  }

  modify(id: string, data: StatementDataModification): StatementData | undefined {
    const index = this.db.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.db[index].modification = data;
      return this.db[index];
    } else {
      return undefined;
    }
  }

  approve(id: string): StatementData | undefined {
    const index = this.db.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.db[index].state === 'COMPLETED';
      return this.db[index];
    } else {
      return undefined;
    }
  }

  update(id: string, data: StatementData): StatementData | undefined {
    const index = this.db.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.db[index] = data;
      return data;
    } else {
      return undefined;
    }
  }
}

export type ReportType = 'errors' | 'foundation' | 'statements' | 'memos' | 'refunds';
export interface Report {
  filename: string;
  createdAt: string;
  content: string;
}

export class ReportsService {
  private db: { [key in ReportType]: Report[] };
  public constructor() {
    this.db = {
      errors: [
        { filename: 'one.csv', createdAt: '2020-01-01', content: 'one' },
        { filename: 'two.csv', createdAt: '2020-01-02', content: 'two' },
      ],
      memos: [{ filename: 'three.csv', createdAt: '2020-01-03', content: 'three' }],
      foundation: [],
      statements: [],
      refunds: [],
    };
  }

  getAll(type: ReportType): Report[] {
    return this.db[type];
  }
  get(type: ReportType, filename: string): Report | undefined {
    return this.db[type].find((item) => item.filename === filename);
  }
  set(type: ReportType, filename: string, content: string): Report {
    const report = { filename, content, createdAt: new Date().toISOString() };
    this.db[type].push(report);
    return report;
  }
}
