
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    city character varying(50),
    country character varying(50) NOT NULL,
    postcode character varying(10) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    county character varying,
    address_line_1 character varying,
    address_line_2 character varying,
    address_line_3 character varying,
    source_system_id integer
);

CREATE TYPE contact_titles as ENUM('Mrs', 'Miss', 'Dr', 'Ms', 'Mr');

CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    address_id integer NOT NULL REFERENCES addresses(id),
    title contact_titles,
    first_name character varying(35) NOT NULL,
    last_name character varying(35) NOT NULL,
    email character varying(100),
    phone character varying(12),
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    source_system_id integer,
    CONSTRAINT address_name_surname_pk UNIQUE (address_id, first_name, last_name)
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_reference character varying(15) NOT NULL,
    orion_account_number character varying,
    primary_contact_id integer REFERENCES contacts(id),
    secondary_contact_id integer REFERENCES contacts(id),
    tertiary_contact_id integer REFERENCES contacts(id),
    company_reg_number character varying(8),
    company_name character varying(50),
    company_vat_number character varying(12),
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    billing_address_id integer REFERENCES addresses(id),
    source_system_id integer,
    generator_id character varying(20) DEFAULT NULL::character varying
);

CREATE TYPE account_state as ENUM('Active', 'Pending', 'Dispute', 'Closed');
CREATE TYPE account_payment_plans as ENUM('BACs', 'Cheque', 'Internal Transfer');

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    customer_id integer NOT NULL REFERENCES customers(id),
    state account_state NOT NULL DEFAULT 'Pending'::account_state,
    beneficiary_name character varying,
    beneficiary_sort_code character varying,
    beneficiary_account_number character varying,
    payment_plan account_payment_plans,
    payment_suspended boolean DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    source_system_id integer,
    start_on date,
    end_on date
);

CREATE TYPE tariff_types as ENUM('Export', 'Generation', 'SEG');

CREATE TABLE tariffs (
    id SERIAL PRIMARY KEY,
    code character varying NOT NULL UNIQUE,
    type tariff_types NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    source_system_id integer
);

CREATE TABLE tariff_rates (
    id SERIAL PRIMARY KEY,
    tariff_id integer NOT NULL REFERENCES tariffs(id),
    rate numeric NOT NULL,
    start_date_on date NOT NULL,
    end_date_on date,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    source_system_id integer
);


CREATE TYPE installation_types as ENUM(
  'Retrofit',
  'New build',
  'Standalone',
  'Extension of an existing FiT-accredited installation',
  'None'
);

CREATE TYPE installation_technology_types as ENUM(
  'PV', -- Solar PV
  'H', -- Hydro
  'W', -- Wind
  'AD', -- Anaerobic digestion
  'CHP' -- MicroCHP
);

CREATE TYPE installation_property_type as ENUM(
  'Domestic',
  'Commercial',
  'Farm',
  'Industrial',
  'Not for profit',
  'School/Education',
  'Other'
);

CREATE TYPE installation_export_type as ENUM(
  'Deemed',
  'Metered Export',
  'Off Grid',
  'PPA'
);

CREATE TABLE installations (
    id SERIAL PRIMARY KEY,
    name character varying,
    type installation_types NOT NULL,
    technology_type installation_technology_types NOT NULL,
    property_type installation_property_type NOT NULL,
    export_type installation_export_type,
    commissioned_on date,
    decommissioned_on date,
    installed_on date NOT NULL,
    verified_on date,
    reverified_on date,
    inspected_on date,
    mcs_reference character varying NOT NULL,
    tic_reference numeric(10,3) NOT NULL,
    dnc_reference numeric(10,3) NOT NULL,
    roofit_reference character varying(25),
    has_battery_storage boolean,
    battery_installation_date_on date,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    export_mpan character varying,
    source_system_id integer,
    name_of_grant character varying,
    value_of_grant numeric(10,2),
    eligibility_start_on date,
    eligibility_end_on date,
    date_grant_repaid date,
    epc_rate character varying(1),
    epc_date date,
    epc_number integer,
    legacy_fit_db_id character varying,
    supply_mpan character varying,
    switched_from character varying,
    switched_to character varying,
    switched_on date,
    address_id integer NOT NULL REFERENCES addresses(id)
);

CREATE TYPE contract_scheme_types as ENUM('FIT', 'SEG');

CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    scheme_type contract_scheme_types NOT NULL,
    scheme_account_reference character varying NOT NULL,
    confirmation_on date,
    terms_and_conditions_agreed boolean NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    installation_id integer NOT NULL REFERENCES installations(id),
    generation_tariff_id integer REFERENCES tariffs(id),
    export_tariff_id integer REFERENCES tariffs(id),
    source_system_id integer,
    export_percentage_split integer,
    generation_percentage_split integer,
    contact_id integer NOT NULL REFERENCES contacts(id),
    account_id integer NOT NULL REFERENCES accounts(id)
);


CREATE TABLE meters (
    id SERIAL PRIMARY KEY,
    mpan character varying NOT NULL,
    shared boolean NOT NULL,
    serial_number character varying NOT NULL,
    make character varying NOT NULL,
    model character varying NOT NULL,
    hh_metered boolean NOT NULL,
    gsp character varying,
    distribution_region character varying,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    source_system_id integer
);

CREATE TYPE meter_types as ENUM('Export', 'Generation');

CREATE TABLE installation_meters (
    id SERIAL PRIMARY KEY,
    meter_type meter_types NOT NULL,
    meter_id integer NOT NULL REFERENCES meters(id),
    installation_id integer NOT NULL REFERENCES installations(id),
    start_on date,
    end_on date,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    source_system_id integer
);
