import { Client } from 'pg';
import {
  id,
  fixture,
  rel,
  template,
  alternate,
  Fixture,
  BuildFixture,
  BuildColumns,
  generate,
  toSetupQueries,
  toTeardownQueries,
  setUp,
  tearDown,
} from '../src';

type AddressFixture = Fixture<{
  id: number;
  city: string;
  county: string;
  country: string;
  postcode: string;
  address_line_1: string;
  address_line_2: string;
  source_system_id: number;
}>;

type ContactFixture = Fixture<{
  id: number;
  address_id: number;
  title: 'Mr' | 'Mrs';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}>;

type CustomerFixture = Fixture<{
  id: number;
  customer_reference: string;
  primary_contact_id: number;
  secondary_contact_id: number;
  billing_address_id: number;
  source_system_id: number;
  generator_id: string;
}>;

type AccountFixture = Fixture<{
  id: number;
  customer_id: number;
  state: string;
  payment_plan: string;
  start_on: Date;
  end_on?: string;
}>;

type InstallationFixture = Fixture<{
  id: number;
  name: string;
  type: string;
  technology_type: string;
  property_type: string;
  export_type: string;
  commissioned_on: Date;
  installed_on: Date;
  mcs_reference: string;
  tic_reference: number;
  dnc_reference: number;
  export_mpan: string;
  source_system_id: number;
  legacy_fit_db_id: string;
  supply_mpan: string;
  address_id: number;
}>;

type ContractFixture = Fixture<{
  id: number;
  scheme_type: string;
  scheme_account_reference: string;
  terms_and_conditions_agreed: boolean;
  installation_id: number;
  generation_tariff_id: number;
  export_tariff_id: number;
  source_system_id: number;
  contact_id: number;
  account_id: number;
}>;

type MeterFixture = Fixture<{
  id: number;
  mpan: string;
  shared: boolean;
  serial_number: string;
  make: string;
  model: string;
  hh_metered: boolean;
  gsp: string;
  source_system_id: number;
}>;

type InstallationMeterFixture = Fixture<{
  id: number;
  meter_type: 'Generation' | 'Export';
  meter_id: number;
  installation_id: number;
  start_on: Date;
  end_on?: Date;
  source_system_id: number;
}>;

type TariffFixture = Fixture<{
  id: number;
  code: string;
  type: 'Generation' | 'Export';
  source_system_id: number;
}>;

type TariffRateFixture = Fixture<{
  id: number;
  tariff_id: number;
  rate: number;
  start_date_on: Date;
  end_date_on: Date;
  source_system_id: number;
}>;

type MeterReadFixture = Fixture<{
  id: number;
  meter_id: number;
  date_on: Date;
  value: number;
  type: string;
  reason: string;
  source_system_id: number;
  tolerance: number;
  is_accepted: boolean;
  deleted_at?: Date;
  submitted_at: Date;
  history: string;
}>;

const minDate = new Date('2000-01-01T00:00:00.000Z');
const maxDate = new Date('3000-01-01T00:00:00.000Z');

const buildAddress: BuildFixture<AddressFixture> = ({ columns } = {}) =>
  fixture('addresses', {
    id,
    city: template('City %s'),
    county: template('County %s'),
    country: 'UK',
    postcode: template('BST SW%s'),
    address_line_1: template('Address %s 1'),
    address_line_2: template('Address %s 2'),
    source_system_id: id,
    ...columns,
  });

const buildContact: BuildFixture<ContactFixture, { address?: AddressFixture }> = ({
  columns,
  address = buildAddress(),
} = {}) =>
  fixture('contacts', {
    id,
    address_id: rel(address, 'id'),
    title: alternate('Mr', 'Mrs'),
    first_name: template('Name %s'),
    last_name: template('Name %s'),
    email: template('email%s@example.com'),
    phone: '11111 %s',
    ...columns,
  });

const buildCustomer: BuildFixture<
  CustomerFixture,
  { contact?: ContactFixture; secondaryContact?: ContactFixture; billingAddress?: AddressFixture }
> = ({ columns, contact = buildContact(), secondaryContact = buildContact(), billingAddress = buildAddress() } = {}) =>
  fixture('customers', {
    id,
    customer_reference: template('customer-%s'),
    primary_contact_id: rel(contact, 'id'),
    secondary_contact_id: rel(secondaryContact, 'id'),
    billing_address_id: rel(billingAddress, 'id'),
    source_system_id: id,
    generator_id: template('11111-%s'),
    ...columns,
  });

const buildAccount: BuildFixture<AccountFixture, { customer?: CustomerFixture }> = ({
  columns,
  customer = buildCustomer(),
} = {}) =>
  fixture('accounts', {
    id,
    customer_id: rel(customer, 'id'),
    state: 'Active',
    payment_plan: 'BACS',
    start_on: new Date('2020-01-01'),
    end_on: undefined,
    ...columns,
  });

const buildInstallation: BuildFixture<InstallationFixture, { installationAddress?: AddressFixture }> = ({
  columns,
  installationAddress = buildAddress(),
} = {}) =>
  fixture('installations', {
    id,
    name: template('Installation %s'),
    type: alternate(
      'Retrofit',
      'New build',
      'Standalone',
      'Extension of an existing FiT-accredited installation',
      'None',
    ),
    technology_type: alternate('PV', 'H', 'W', 'AD', 'CHP'),
    property_type: alternate(
      'Domestic',
      'Commercial',
      'Farm',
      'Industrial',
      'Not for profit',
      'School/Education',
      'Other',
    ),
    export_type: alternate('Deemed', 'Metered Export', 'Off Grid', 'PPA'),
    commissioned_on: new Date('2020-01-01'),
    installed_on: new Date('2020-01-01'),
    mcs_reference: '123',
    tic_reference: 1000,
    dnc_reference: 1000,
    export_mpan: '11111111111111111',
    source_system_id: id,
    legacy_fit_db_id: template('FIT%s'),
    supply_mpan: '11111111111111111',
    address_id: rel(installationAddress, 'id'),
    ...columns,
  });

const buildTariff: BuildFixture<TariffFixture> = ({ columns } = {}) =>
  fixture('tariffs', {
    id,
    code: template('Tariff %s'),
    type: alternate('Generation', 'Export'),
    source_system_id: id,
    ...columns,
  });

const buildTariffRate: BuildFixture<TariffRateFixture, { tariff?: TariffFixture }> = ({
  columns,
  tariff = buildTariff(),
} = {}) =>
  fixture('tariff_rates', {
    id,
    tariff_id: rel(tariff, 'id'),
    rate: 5,
    start_date_on: minDate,
    end_date_on: maxDate,
    source_system_id: id,
    ...columns,
  });

const buildContract: BuildFixture<
  ContractFixture,
  {
    installation?: InstallationFixture;
    generationTariff?: TariffFixture;
    exportTariff?: TariffFixture;
    contact?: ContactFixture;
    account?: AccountFixture;
  }
> = ({
  columns,
  installation = buildInstallation(),
  generationTariff = buildTariff({ columns: { type: 'Generation' } }),
  exportTariff = buildTariff({ columns: { type: 'Export' } }),
  contact = buildContact(),
  account = buildAccount(),
} = {}) =>
  fixture('contracts', {
    id,
    scheme_type: 'FIT',
    scheme_account_reference: rel(installation, 'legacy_fit_db_id'),
    terms_and_conditions_agreed: true,
    installation_id: rel(installation, 'id'),
    generation_tariff_id: rel(generationTariff, 'id'),
    export_tariff_id: rel(exportTariff, 'id'),
    source_system_id: id,
    contact_id: rel(contact, 'id'),
    account_id: rel(account, 'id'),
    ...columns,
  });

const buildMeter: BuildFixture<MeterFixture> = ({ columns } = {}) =>
  fixture('meters', {
    id,
    mpan: '11111111',
    shared: false,
    serial_number: '123123123',
    make: template('Make %s'),
    model: template('Model %s'),
    hh_metered: true,
    gsp: '_L',
    source_system_id: id,
    ...columns,
  });

const buildInstallationMeter: BuildFixture<
  InstallationMeterFixture,
  { meter?: MeterFixture; installation?: InstallationFixture }
> = ({ columns, meter = buildMeter(), installation = buildInstallation() } = {}) =>
  fixture('installation_meters', {
    id,
    meter_type: alternate('Generation', 'Export'),
    meter_id: rel(meter, 'id'),
    installation_id: rel(installation, 'id'),
    start_on: new Date('2020-01-01'),
    source_system_id: id,
    ...columns,
  });

const buildMeterRead: BuildFixture<MeterReadFixture, { meter?: MeterFixture }> = ({
  columns,
  meter = buildMeter(),
} = {}) =>
  fixture('meter_reads', {
    id,
    meter_id: rel(meter, 'id'),
    date_on: new Date('2020-01-01'),
    value: 0,
    type: alternate('Opening', 'Closing', 'Quarterly', 'Meter Verification'),
    reason: alternate('FQ1', 'Opening'),
    source_system_id: id,
    tolerance: 0,
    is_accepted: true,
    deleted_at: undefined,
    submitted_at: new Date('2020-01-01'),
    history: '[]',
    ...columns,
  });

const buildMeterWithReads = ({
  columns,
  readsColumns,
}: {
  columns?: BuildColumns<MeterFixture>;
  readsColumns: BuildColumns<MeterReadFixture>[];
}): { meter: MeterFixture; reads: MeterReadFixture[] } => {
  const meter = buildMeter({ columns });
  return { meter, reads: readsColumns.map((columns) => buildMeterRead({ columns, meter })) };
};

const buildInstallationMeterWithReads = ({
  columns,
  meterColumns,
  readsColumns,
  installation,
}: {
  installation: InstallationFixture;
  columns?: BuildColumns<InstallationMeterFixture>;
  meterColumns?: BuildColumns<MeterFixture>;
  readsColumns: BuildColumns<MeterReadFixture>[];
}): { meter: MeterFixture; reads: MeterReadFixture[]; installationMeter: InstallationMeterFixture } => {
  const { meter, reads } = buildMeterWithReads({ columns: meterColumns, readsColumns });
  return { meter, reads, installationMeter: buildInstallationMeter({ columns, installation, meter }) };
};

const buildContractWithTariffs = ({
  account,
  installation,
  gen,
  exp,
  columns,
}: {
  account?: AccountFixture;
  installation?: InstallationFixture;
  columns?: BuildColumns<ContractFixture>;
  gen?: BuildColumns<TariffRateFixture>[];
  exp?: BuildColumns<TariffRateFixture>[];
}): {
  contract: ContractFixture;
  tariffs: TariffFixture[];
  tariffRates: TariffRateFixture[];
} => {
  const generationTariff = buildTariff({ columns: { type: 'Generation' } });
  const generationTariffRates = gen?.map((columns) => buildTariffRate({ tariff: generationTariff, columns })) ?? [];
  const exportTariff = buildTariff({ columns: { type: 'Export' } });
  const exportTariffRates = exp?.map((columns) => buildTariffRate({ tariff: generationTariff, columns })) ?? [];
  const contract = buildContract({ columns, account, installation, generationTariff, exportTariff });

  return {
    contract,
    tariffs: [generationTariff, exportTariff],
    tariffRates: [...generationTariffRates, ...exportTariffRates],
  };
};

const buildInstallationWithMeters = ({
  columns,
  gen,
  exp,
}: {
  columns?: BuildColumns<InstallationFixture>;
  gen: Array<Omit<Parameters<typeof buildInstallationMeterWithReads>[0], 'installation'>>;
  exp: Array<Omit<Parameters<typeof buildInstallationMeterWithReads>[0], 'installation'>>;
}): {
  installation: InstallationFixture;
  meters: MeterFixture[];
  meterReads: MeterReadFixture[];
  installationMeters: InstallationMeterFixture[];
} => {
  const installation = buildInstallation({ columns });

  const all = [
    ...gen.map((params) => buildInstallationMeterWithReads({ ...params, installation })),
    ...exp.map((params) => buildInstallationMeterWithReads({ ...params, installation })),
  ];

  return {
    installation,
    meters: all.map(({ meter }) => meter),
    meterReads: all.flatMap(({ reads }) => reads),
    installationMeters: all.map(({ installationMeter }) => installationMeter),
  };
};

const oneInstallationAccount = ({ firstName }: { firstName: string }): Fixture[] => {
  const contact = buildContact({ columns: { first_name: firstName } });
  const account = buildAccount({ customer: buildCustomer({ contact }) });
  const { installation, installationMeters, meterReads } = buildInstallationWithMeters({
    gen: [
      {
        readsColumns: [
          { type: 'Opening', value: 0, date_on: new Date('2021-01-01') },
          { type: 'Quarterly', value: 100, date_on: new Date('2021-03-01') },
        ],
      },
    ],
    exp: [
      {
        readsColumns: [
          { type: 'Opening', value: 0, date_on: new Date('2021-01-01') },
          { type: 'Quarterly', value: 100, date_on: new Date('2021-03-01') },
        ],
      },
    ],
  });
  const { contract, tariffRates } = buildContractWithTariffs({
    installation,
    account,
    exp: [{ rate: 5 }],
    gen: [{ rate: 5 }],
  });

  return [account, contract, ...installationMeters, ...tariffRates, ...meterReads];
};

describe('Laminar fixtures', () => {
  it('Should start and stop services', async () => {
    const fixtures = oneInstallationAccount({ firstName: 'Test' });

    const entities = generate(fixtures);
    expect(entities).toMatchSnapshot('Entites');
    expect(toSetupQueries(500, entities)).toMatchSnapshot('Setup Queries');
    expect(toTeardownQueries(500, entities)).toMatchSnapshot('Teardown Queries');

    const db = new Client({
      connectionString: 'postgres://example-admin:example-pass@localhost:5432/example',
    });

    await db.connect();
    try {
      await setUp({ db, fixtures });
      await tearDown({ db, fixtures });
    } finally {
      await db.end();
    }
  });
});
