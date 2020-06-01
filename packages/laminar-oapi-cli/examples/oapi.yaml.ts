import { Context, ContextLike, LaminarResponse } from "@ovotech/laminar";

import { OapiContext, OapiConfig } from "@ovotech/laminar-oapi";

export interface Config<C extends ContextLike = ContextLike> extends OapiConfig<C> {
    paths: {
        "/test": {
            post: (context: TTestPostContext & C) => TTestPostResponse;
            get: (context: TTestGetContext & C) => TTestGetResponse;
        };
    };
}

export interface User {
    email: string;
    scopes?: string[];
}

export interface Test {
    text: string;
    user?: User;
    [key: string]: unknown;
}

export type TTestPostResponse = LaminarResponse<Test> | Test | Promise<LaminarResponse<Test> | Test>;

export interface TTestPostContext extends Context, OapiContext {
    body: User;
}

export type TTestGetResponse = LaminarResponse<Test> | Test | Promise<LaminarResponse<Test> | Test>;

export interface TTestGetContext extends Context, OapiContext {
}
