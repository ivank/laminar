import { OapiContext, OapiConfig, Empty, HttpListener, openApi, ResponseOapi } from "@ovotech/laminar";

import { Readable } from "stream";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<HttpListener<R>> => openApi(config);

export interface NewUser {
    email: string;
    [key: string]: unknown;
}

export interface User {
    email: string;
    id: number;
    [key: string]: unknown;
}

export type ResponseUsersPost = ResponseOapi<User, 200, "application/json">;

export interface RequestUsersPost extends OapiContext {
    body: NewUser;
}

export type PathUsersPost<R extends Empty = Empty> = (req: RequestUsersPost & R) => Promise<ResponseUsersPost>;

export type ResponseUsersGet = ResponseOapi<User[], 200, "application/json">;

export type PathUsersGet<R extends Empty = Empty> = (req: OapiContext & R) => Promise<ResponseUsersGet>;

export type ResponseUsersIdGet = ResponseOapi<User, 200, "application/json"> | ResponseOapi<string | Readable | Buffer, 404, "application/json">;

export interface RequestUsersIdGet extends OapiContext {
    path: {
        id: number;
    };
}

export type PathUsersIdGet<R extends Empty = Empty> = (req: RequestUsersIdGet & R) => Promise<ResponseUsersIdGet>;

export type ResponseUsersIdDelete = ResponseOapi<string | Readable | Buffer, 200, "application/json"> | ResponseOapi<string | Readable | Buffer, 404, "application/json">;

export interface RequestUsersIdDelete extends OapiContext {
    path: {
        id: number;
    };
}

export type PathUsersIdDelete<R extends Empty = Empty> = (req: RequestUsersIdDelete & R) => Promise<ResponseUsersIdDelete>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/users": {
            post: PathUsersPost<R>;
            get: PathUsersGet<R>;
        };
        "/users/{id}": {
            get: PathUsersIdGet<R>;
            delete: PathUsersIdDelete<R>;
        };
    };
}
