import { RequestOapi, OapiConfig, Empty, App, openApi, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<App<R>> => openApi(config);

export interface UserResponse {
    id?: string;
    name?: string;
    [key: string]: unknown;
}

export type ResponseUserIdGet = ResponseOapi<UserResponse, 200, "application/json">;

export interface RequestUserIdGet extends RequestOapi {
    path: {
        id: string;
    };
}

export type PathUserIdGet<R extends Empty = Empty> = (req: RequestUserIdGet & R) => ResponseUserIdGet | Promise<ResponseUserIdGet>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/user/{id}": {
            get: PathUserIdGet<R>;
        };
    };
}
