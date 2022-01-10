import { validate, Schema, FormatErrors } from '@ovotech/json-schema';

const schema: Schema = {
  type: 'string',
  format: 'email',
};

const value = '12horses';

// << format-errors
const formatErrors: FormatErrors = (validation) =>
  validation.errors.map((error) => ` - ${error.code} : ${error.name} \n`);

validate({ schema, value, formatErrors }).then((result) => console.log(result.valid, result.errors));
// format-errors
