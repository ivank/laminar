## Logical Type Decimal

```bash
yarn add @laminarjs/avro
```

And then you can use `AvroDecimal` for a logicalType of a field.

> [examples/simple.ts](https://github.com/ivank/laminar/tree/main/packages/avro/examples/avro-decimal.ts)

```typescript
import { Type, Schema } from 'avsc';
import { AvroDecimal } from '@laminarjs/avro';
import { Decimal } from 'decimal.js';

const decimalSchema: Schema = {
  type: 'bytes',
  logicalType: 'decimal',
  precision: 16,
  scale: 8,
};

export const DecimalType = Type.forSchema(decimalSchema, {
  logicalTypes: { decimal: AvroDecimal },
});

const encoded = DecimalType.toBuffer(new Decimal('100.01'));
const decoded = DecimalType.fromBuffer(encoded);

console.log(decoded);
```

You can also use then you can use `AvroEpochDays` for a logicalType of a field.

> [examples/simple.ts](https://github.com/ivank/laminar/tree/main/packages/avro/examples/avro-timestamp-millis.ts)

```typescript
import { Type, Schema } from 'avsc';
import { AvroTimestampMillis } from '@laminarjs/avro';

const eventSchema: Schema = {
  type: 'record',
  name: 'Event',
  fields: [
    {
      name: 'field1',
      type: { type: 'long', logicalType: 'timestamp-millis' },
    },
  ],
};

const EventType = Type.forSchema(eventSchema, {
  logicalTypes: { 'timestamp-millis': AvroTimestampMillis },
});

const encoded = EventType.toBuffer({ field1: new Date('2020-01-01') });
const decoded = EventType.fromBuffer(encoded);

console.log(decoded);
```

It also supports schema evolution from int, logical:date and string types

> [examples/evolution.ts](https://github.com/ivank/laminar/tree/main/packages/avro/examples/avro-timestamp-millis-evolution.ts)

```typescript
import { Type, Schema } from 'avsc';
import { AvroTimestampMillis } from '@laminarjs/avro';

const previousSchema: Schema = {
  type: 'record',
  name: 'Event',
  fields: [
    {
      name: 'field1',
      type: { type: 'string' },
    },
  ],
};

const eventSchema: Schema = {
  type: 'record',
  name: 'Event',
  fields: [
    {
      name: 'field1',
      type: { type: 'long', logicalType: 'timestamp-millis' },
    },
  ],
};

const PreviousType = Type.forSchema(previousSchema);
const EventType = Type.forSchema(eventSchema, {
  logicalTypes: { 'timestamp-millis': AvroTimestampMillis },
});
const previousTypeResolver = EventType.createResolver(PreviousType);

const encoded = PreviousType.toBuffer({ field1: '2020-01-01' });
const decoded = EventType.fromBuffer(encoded, previousTypeResolver);

console.log(decoded);
```

You can also use `AvroEpochDays` for a logicalType of a field.

> [examples/simple.ts](https://github.com/ivank/laminar/tree/main/packages/avro/examples/avro-epoch-days.ts)

```typescript
import { Type, Schema } from 'avsc';
import { AvroEpochDays } from '@laminarjs/avro';

const eventSchema: Schema = {
  type: 'record',
  name: 'Event',
  fields: [
    {
      name: 'field1',
      type: { type: 'int', logicalType: 'date' },
    },
  ],
};

const EventType = Type.forSchema(eventSchema, { logicalTypes: { date: AvroEpochDays } });

const encoded = EventType.toBuffer({ field1: new Date('2020-01-01') });
const decoded = EventType.fromBuffer(encoded);

console.log(decoded);
```

It also supports schema evolution from int, logical:date and string types

> [examples/evolution.ts](https://github.com/ivank/laminar/tree/main/packages/avro/examples/avro-epoch-days-evolution.ts)

```typescript
import { Type, Schema } from 'avsc';
import { AvroEpochDays } from '@laminarjs/avro';

const previousSchema: Schema = {
  type: 'record',
  name: 'Event',
  fields: [
    {
      name: 'field1',
      type: { type: 'string' },
    },
  ],
};

const eventSchema: Schema = {
  type: 'record',
  name: 'Event',
  fields: [
    {
      name: 'field1',
      type: { type: 'int', logicalType: 'date' },
    },
  ],
};

const PreviousType = Type.forSchema(previousSchema);
const EventType = Type.forSchema(eventSchema, {
  logicalTypes: { date: AvroEpochDays },
});
const previousTypeResolver = EventType.createResolver(PreviousType);

const encoded = PreviousType.toBuffer({ field1: '2020-01-01' });
const decoded = EventType.fromBuffer(encoded, previousTypeResolver);

console.log(decoded);
```
