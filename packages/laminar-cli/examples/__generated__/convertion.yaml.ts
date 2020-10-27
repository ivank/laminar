import { RequestOapi, OapiConfig, Empty, App, openApi, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<App<R>> => openApi(config);

export interface User {
    email: string;
    title?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface NewUser {
    result: string;
    user: User;
    [key: string]: unknown;
}

export type ResponseUserPost = ResponseOapi<NewUser, 200, "application/json">;

export interface RequestUserPost extends RequestOapi {
    body: User;
}

export type PathUserPost<R extends Empty = Empty> = (req: RequestUserPost & R) => ResponseUserPost | Promise<ResponseUserPost>;

export type ResponseUserGet = ResponseOapi<User, 200, "application/json">;

export type PathUserGet<R extends Empty = Empty> = (req: RequestOapi & R) => ResponseUserGet | Promise<ResponseUserGet>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/user": {
            post: PathUserPost<R>;
            get: PathUserGet<R>;
        };
    };
}
