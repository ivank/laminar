import { PathPetsIdDelete } from '../__generated__/petstore';
import { jsonNotFound, jsonNoContent } from '@laminar/laminar';
import { PetsDbContext } from '../middleware';

/**
 * Request and response are both validated runtime and checked at compile time
 * That's why we need to use `jsonNoContent` and `jsonNotFound` to set the correct Content-Type header and status.
 *
 * Laminar provides helpers for common status codes and content types, but it's easy to roll your own
 *
 * Anything that's deviating from the OpenAPI schema - the shape of the json response, status or content-type
 * would be flagged by typescript as an error
 */
export const pathPetsIdDelete: PathPetsIdDelete<PetsDbContext> = async ({ petsDb, path: { id } }) => {
  const pet = await petsDb.find(id);
  if (pet) {
    await petsDb.remove(id);
    return jsonNoContent();
  } else {
    return jsonNotFound({ code: 12, message: `Cannot delete pet ${id} - pet not found` });
  }
};
