import { PathPetsGet } from '../__generated__/petstore';
import { jsonOk } from '@ovotech/laminar';
import { RequestPetsDb } from '../middleware';

export const pathPetsGet: PathPetsGet<RequestPetsDb> = async ({ petsDb, query }) => {
  const { tags, limit } = query;
  return jsonOk(await petsDb.all({ tags, limit }));
};
