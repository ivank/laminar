import { validate, Schema } from '@laminarjs/json-schema';

const schema: Schema = {
  type: 'string',
  format: 'email',
};

const value = '12horses';

validate({ schema, value }).then((result) => console.log(result.valid, result.errors));
