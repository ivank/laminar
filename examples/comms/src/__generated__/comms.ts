import { OapiContext, OapiConfig, Empty, HttpListener, openApi, ResponseOapi } from "@ovotech/laminar";

export const openApiTyped = <R extends Empty = Empty>(config: Config<R>): Promise<HttpListener<R>> => openApi(config);

export interface SendComm {
    email: string;
}

export interface Comm {
    id: number;
    commId: string;
    status: "Pending" | "Delivered" | "Failed";
}

export type ResponseCommsPost = ResponseOapi<Comm, 200, "application/json">;

/**
 * Send New Comm
 */
export interface RequestCommsPost extends OapiContext {
    body: SendComm;
}

/**
 * Send New Comm
 */
export type PathCommsPost<R extends Empty = Empty> = (req: RequestCommsPost & R) => Promise<ResponseCommsPost>;

export interface Error {
    message: string;
}

export type ResponseCommsIdGet = ResponseOapi<Comm, 200, "application/json"> | ResponseOapi<Error, 404, "application/json">;

/**
 * Retrieve Comm
 */
export interface RequestCommsIdGet extends OapiContext {
    path: {
        id: string;
    };
}

/**
 * Retrieve Comm
 */
export type PathCommsIdGet<R extends Empty = Empty> = (req: RequestCommsIdGet & R) => Promise<ResponseCommsIdGet>;

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/comms": {
            /**
             * Send New Comm
             */
            post: PathCommsPost<R>;
        };
        "/comms/{id}": {
            /**
             * Retrieve Comm
             */
            get: PathCommsIdGet<R>;
        };
    };
}
