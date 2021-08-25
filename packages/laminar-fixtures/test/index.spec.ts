import { Client } from 'pg';
import { generate, setUp, tearDown, toSetupQueries, toTeardownQueries, Fixture } from '../src';
import { id, fixture, rel, template, alternate, cloneFixture } from '../src';

describe('Laminar fixtures', () => {
  it('Should start and stop services', async () => {
    const address: Fixture = fixture('addresses', {
      id,
      city: template('City %s'),
      county: template('County %s'),
      country: 'UK',
      postcode: template('BST SW%s'),
      updated_at: null,
      address_line_1: template('Address %s 1'),
      address_line_2: template('Address %s 2'),
      source_system_id: id,
    });

    const billingAddress = cloneFixture(address);
    const secondaryAddress = cloneFixture(address);

    const contact = fixture('contacts', {
      id,
      address_id: rel(address, 'id'),
      title: alternate('Mr', 'Mrs'),
      first_name: template('Name %s'),
      last_name: template('Name %s'),
      email: template('email%s@example.com'),
      phone: '123123',
      updated_at: null,
    });

    const secondaryContact = cloneFixture(contact, { columns: { address_id: rel(secondaryAddress, 'id') } });

    const customer = fixture('customers', {
      id,
      customer_reference: template('customer-%s'),
      primary_contact_id: rel(contact, 'id'),
      secondary_contact_id: rel(secondaryContact, 'id'),
      billing_address_id: rel(billingAddress, 'id'),
      source_system_id: id,
      generator_id: template('11111-%s'),
      updated_at: null,
    });

    const account = fixture('accounts', {
      id,
      customer_id: rel(customer, 'id'),
      state: 'Active',
      payment_plan: 'BACs',
      updated_at: null,
      start_on: new Date('2020-01-01'),
      end_on: null,
    });

    const installationAddress = cloneFixture(address);

    const installation = fixture('installations', {
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
    });

    const generationTariff = fixture('tariffs', {
      id,
      code: template('Tariff %s'),
      type: 'Generation',
      source_system_id: id,
    });
    const exportTariff = cloneFixture(generationTariff, { columns: { type: 'Export' } });

    const contract = fixture('contracts', {
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
    });

    const generationMeter = fixture('meters', {
      id,
      mpan: '11111111',
      shared: false,
      serial_number: '123123123',
      make: template('Make %s'),
      model: template('Model %s'),
      hh_metered: true,
      gsp: '_L',
      source_system_id: id,
    });
    const exportMeter = cloneFixture(generationMeter);

    const generationInstallationMeter = fixture('installation_meters', {
      id,
      meter_type: 'Generation',
      meter_id: rel(generationMeter, 'id'),
      installation_id: rel(installation, 'id'),
      start_on: new Date('2020-01-01'),
      source_system_id: id,
    });

    const exportInstallationMeter = cloneFixture(generationInstallationMeter, {
      columns: {
        meter_type: 'Export',
        meter_id: rel(exportMeter, 'id'),
      },
    });

    const fixtures = [contract, generationInstallationMeter, exportInstallationMeter];

    const entities = generate(fixtures);
    expect(entities).toMatchSnapshot('Entites');
    expect(toSetupQueries(500, entities)).toMatchSnapshot('Setup Queries');
    expect(toTeardownQueries(500, entities)).toMatchSnapshot('Teardown Queries');

    const db = new Client({
      connectionString: 'postgres://example-admin:example-pass@localhost:5432/example',
    });

    await db.connect();
    try {
      await setUp({ db, fixtures: [contract, generationInstallationMeter, exportInstallationMeter] });
      await tearDown({ db, fixtures: [contract, generationInstallationMeter, exportInstallationMeter] });
    } finally {
      await db.end();
    }
  });
});
