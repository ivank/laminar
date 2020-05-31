import { Context, ContextLike, LaminarResponse } from "@ovotech/laminar";

import { OapiContext, OapiConfig } from "@ovotech/laminar-oapi";

export interface Config<C extends ContextLike = ContextLike> extends OapiConfig<C> {
    paths: {
        "/accounts/{accountId}/meters": {
            get: (context: TAccountsAccountIdMetersGetContext & C) => TAccountsAccountIdMetersGetResponse;
        };
    };
}

export interface AccountMeterBase {
    tariffName: string;
    plan: string;
    address: string;
    postCode: string;
    mpxn: string;
    msn: string;
    startDate: string;
    endDate: string;
    [key: string]: unknown;
}

export interface HttpError {
    message?: string;
}

export type TAccountsAccountIdMetersGetResponse = LaminarResponse<AccountMeterBase[]> | AccountMeterBase[] | LaminarResponse<HttpError> | HttpError | Promise<LaminarResponse<AccountMeterBase[]> | AccountMeterBase[] | LaminarResponse<HttpError> | HttpError>;

/**
 * Get Meters, associated with an account, and its service start and end dates (SSD...SED)
 */
export interface TAccountsAccountIdMetersGetContext extends Context, OapiContext {
    path: {
        accountId: string;
    };
}
