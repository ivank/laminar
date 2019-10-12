import { validate, Schema } from '@ovotech/json-schema';

const schema: Schema = {
  type: 'string',
  format: 'email',
};

const data = '12horses';

validate(schema, data).then(result => console.log(result.valid, result.errors));
