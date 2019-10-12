export interface Adapter {
  name: string;
  compile: (schema: {}) => Promise<(data: unknown) => boolean>;
}
