import { Context, LaminarResponse } from "@ovotech/laminar";

import { OapiConfig, OapiContext, OapiSecurityResolver } from "@ovotech/laminar-oapi";

export interface Config<C extends {} = {}> extends OapiConfig<C> {
    paths: {
        "/session": {
            post: (context: TSessionPostContext & C) => TSessionPostResponse;
        };
        "/test-scopes": {
            get: (context: TTestscopesGetContext & C) => TTestscopesGetResponse;
        };
        "/test": {
            get: (context: TTestGetContext & C) => TTestGetResponse;
        };
    };
    security: {
        JWTSecurity: OapiSecurityResolver<C>;
    };
}

export interface CreateSession {
    email: string;
    scopes?: string[];
    other?: string;
}

export interface Session {
    jwt: string;
    expiresAt?: string;
    notBefore?: string;
    user: User;
}

export interface User {
    email: string;
    name?: string;
    picture?: string;
    scopes?: string[];
}

export interface HttpError {
    message?: string;
}

export type TSessionPostResponse = (Session | LaminarResponse<Session> | Promise<Session> | Promise<LaminarResponse<Session>>) | (HttpError | LaminarResponse<HttpError> | Promise<HttpError> | Promise<LaminarResponse<HttpError>>);

/**
 * Cerate a new session
 */
export interface TSessionPostContext extends Context, OapiContext {
    body: CreateSession;
}

export interface Test {
    text: string;
    email?: string;
    scopes?: string[];
    [key: string]: unknown;
}

export type TTestscopesGetResponse = (Test | LaminarResponse<Test> | Promise<Test> | Promise<LaminarResponse<Test>>) | (HttpError | LaminarResponse<HttpError> | Promise<HttpError> | Promise<LaminarResponse<HttpError>>);

/**
 * Secured by jwt with scopes
 */
export interface TTestscopesGetContext extends Context, OapiContext {
}

export type TTestGetResponse = (Test | LaminarResponse<Test> | Promise<Test> | Promise<LaminarResponse<Test>>) | (HttpError | LaminarResponse<HttpError> | Promise<HttpError> | Promise<LaminarResponse<HttpError>>);

/**
 * Secured by jwt without scopes
 */
export interface TTestGetContext extends Context, OapiContext {
}