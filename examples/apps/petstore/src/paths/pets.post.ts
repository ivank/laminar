import { PathPetsPost } from '../__generated__/petstore';
import { jsonOk } from '@ovotech/laminar';
import { RequestPetsDb } from '../middleware';

export const pathPetsPost: PathPetsPost<RequestPetsDb> = async ({ petsDb, body }) => {
  const { name, tag } = body;
  return jsonOk(await petsDb.add({ name, tag }));
};
