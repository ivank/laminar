const parse = (schema: any, refs: { [key: string]: string }) => {
  if (schema.type === 'string' || 'pattern' in schema) {
    return 'string';
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return 'number';
  }
};
