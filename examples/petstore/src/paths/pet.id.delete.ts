import { PathPetsIdDelete } from '../__generated__/petstore';
import { jsonNotFound, jsonNoContent } from '@ovotech/laminar';
import { RequestPetsDb } from '../middleware';

export const pathPetsIdDelete: PathPetsIdDelete<RequestPetsDb> = async ({
  petsDb,
  path: { id },
}) => {
  const pet = await petsDb.find(id);
  if (pet) {
    await petsDb.remove(id);
    return jsonNoContent(null);
  } else {
    return jsonNotFound({ code: 12, message: `Cannot delete pet ${id} - pet not found` });
  }
};
