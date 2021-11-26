import { Readable } from "stream";

import { OapiContext, OapiConfig, Empty, HttpListener, openApi, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<HttpListener<R>> => openApi(config);

export type ResponseTestPost = ResponseOapi<string | Readable | Buffer, 200, "text/html">;

export interface RequestTestPost extends OapiContext {
    body: {
        email: string;
        scopes?: string[];
    };
}

export type PathTestPost<R extends Empty = Empty> = (req: RequestTestPost & R) => Promise<ResponseTestPost>;

export type ResponseTestGet = ResponseOapi<string | Readable | Buffer, 200, "text/html">;

export type PathTestGet<R extends Empty = Empty> = (req: OapiContext & R) => Promise<ResponseTestGet>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/test": {
            post: PathTestPost<R>;
            get: PathTestGet<R>;
        };
    };
}
