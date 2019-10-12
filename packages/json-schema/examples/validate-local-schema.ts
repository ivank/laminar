import { validateCompiled, validate, compile } from '@ovotech/json-schema';
import { join } from 'path';

const schemaFile = join(__dirname, 'color-schema.yaml');

validate(schemaFile, 'orange').then(result => {
  console.log('validate', result.valid, result.errors);
});

compile(schemaFile).then(schema => {
  const result = validateCompiled(schema, 'red');

  console.log('compile', result.valid, result.errors);
});
