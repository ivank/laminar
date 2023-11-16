import { PathPetsPost } from '../__generated__/petstore';
import { jsonOk } from '@laminar/laminar';
import { PetsDbContext } from '../middleware';

/**
 * Request and response are both validated runtime and checked at compoile time
 * That's why we need to use `jsonOk` to set the correct Content-Type header and status.
 *
 * Laminar provides helpers for common status codes and content types, but its easy to roll your own
 *
 * Anithing that's deviating from the OpenAPI schema - the shape of the json response, status or content-type
 * would be flagged by typescript as an error
 */
export const pathPetsPost: PathPetsPost<PetsDbContext> = async ({ petsDb, body }) => {
  const { name, tag } = body;
  return jsonOk(await petsDb.add({ name, tag }));
};
