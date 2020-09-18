import { validateCompiled, validate, compile } from '@ovotech/json-schema';
import { join } from 'path';

const schema = join(__dirname, 'color-schema.yaml');

validate({ schema, value: 'orange' }).then((result) => {
  console.log('validate', result.valid, result.errors);
});

compile({ schema }).then((compiledSchema) => {
  const result = validateCompiled({ schema: compiledSchema, value: 'red' });

  console.log('compile', result.valid, result.errors);
});
