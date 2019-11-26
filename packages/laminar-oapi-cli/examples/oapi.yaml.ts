import { Context, LaminarResponse } from '@ovotech/laminar';

import { OapiConfig, OapiContext } from '@ovotech/laminar-oapi';

export interface Config<C extends {} = {}> extends OapiConfig<C> {
  paths: {
    '/test': {
      post: (context: TTestPostContext & C) => TTestPostResponse;
      get: (context: TTestGetContext & C) => TTestGetResponse;
    };
  };
}

export interface User {
  email: string;
  scopes?: string[];
  [key: string]: any;
}

export interface Test {
  text: string;
  user?: User;
  [key: string]: any;
}

export type TTestPostResponse =
  | Test
  | LaminarResponse<Test>
  | Promise<Test>
  | Promise<LaminarResponse<Test>>;

export interface TTestPostContext extends Context, OapiContext {
  body: User;
}

export type TTestGetResponse =
  | Test
  | LaminarResponse<Test>
  | Promise<Test>
  | Promise<LaminarResponse<Test>>;

export interface TTestGetContext extends Context, OapiContext {}
