import { validate, Schema } from '@ovotech/json-schema';

const schema: Schema = {
  type: 'string',
  format: 'email',
};

const value = '12horses';

// << format-errors
validate({ schema, value, formatErrors: false }).then((result) => console.log(result.valid, result.errors));
// format-errors
