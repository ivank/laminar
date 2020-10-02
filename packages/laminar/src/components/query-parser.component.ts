/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from '../types';
import { parseQueryObjects } from '../helpers';
import { URLSearchParams } from 'url';

/**
 * Request parameters added by the {@link queryParserComponent}
 */
export interface RequestQuery {
  /**
   * Parsed url search query.
   *
   * Supports arrays with name[]=&name[]= or comma separated values
   * Works with nested names too.
   */
  query: any;
}

/**
 * Parse the url search query from incommingMessage.url
 *
 * Supports arrays with name[]=&name[]= or comma separated values
 * Works with nested names too.
 *
 * @category component
 */
export const queryParserComponent = (): Component<RequestQuery> => (next) => (req) => {
  const queryString = req.incommingMessage.url?.split('?')?.[1] ?? '';
  return next({ ...req, query: parseQueryObjects(new URLSearchParams(queryString)) });
};
