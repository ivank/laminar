import { Context, LaminarResponse } from "@ovotech/laminar";

import { OapiConfig, OapiContext } from "@ovotech/laminar-oapi";

export interface Config<C extends {} = {}> extends OapiConfig<C> {
    paths: {
        "/user/{id}": {
            get: (context: TUserIdGetContext & C) => TUserIdGetResponse;
        };
    };
}

export interface UserResponse {
    id?: string;
    name?: string;
    [key: string]: any;
}

export type TUserIdGetResponse = (UserResponse | LaminarResponse<UserResponse> | Promise<UserResponse> | Promise<LaminarResponse<UserResponse>>);

export interface TUserIdGetContext extends Context, OapiContext {
    path: {
        id: string;
    };
}