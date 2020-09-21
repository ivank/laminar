import { PathPetsIdGet } from '../__generated__/petstore';
import { jsonNotFound, jsonOk } from '@ovotech/laminar';
import { RequestPetsDb } from '../middleware';

export const pathPetsIdGet: PathPetsIdGet<RequestPetsDb> = async ({ petsDb, path: { id } }) => {
  const pet = await petsDb.find(id);
  return pet ? jsonOk(pet) : jsonNotFound({ code: 11, message: `Pet ${id} not found` });
};
