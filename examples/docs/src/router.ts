import { router, jsonOk, get, put, route } from '@ovotech/laminar';

const authors: Record<string, string> = { 10: 'Dave', 20: 'Bob' };
const articles: Record<string, string> = { 1: 'Hapiness', 2: 'Love' };

/**
 * Returns a laminar App object
 */
export const app = router(
  /**
   * You match pathnames with strings
   */
  get('/authors', () => jsonOk(authors)),

  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters
   */
  get('/authors/{id}', ({ path: { id } }) => jsonOk(authors[id])),

  /**
   * You can have multiple parameters in the path, all of them will be extracted
   */
  get('/blog/{articleId}/authors/{authorId}', ({ path: { authorId, articleId } }) =>
    jsonOk([articles[articleId], authors[authorId]]),
  ),

  /**
   * You have helpers available for all the HTTP methods: get, post, del, patch, put, options
   */
  put('/authors', ({ body }) => {
    authors[body.id] = body.name;
    return jsonOk({ success: true });
  }),

  /**
   * You can also use the low level function `route` for any custom method, or no method altogether (matching any method)
   */
  route({
    path: '/blog',
    method: 'DRAFT',
    app: ({ body }) => {
      articles[body.id] = body.name;
      return jsonOk({ success: true });
    },
  }),
);
