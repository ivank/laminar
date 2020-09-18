import { RequestOapi, OapiConfig, ResponseOapi } from "@ovotech/laminar-oapi";

import { Empty } from "@ovotech/laminar";

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/accounts/{accountId}/meters": {
            get: PathAccountsAccountIdMetersGet<R>;
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

export type ResponseAccountsAccountIdMetersGet = ResponseOapi<AccountMeterBase[], 200, "application/json"> | ResponseOapi<HttpError, number, "application/json">;

/**
 * Get Meters, associated with an account, and its service start and end dates (SSD...SED)
 */
export interface RequestAccountsAccountIdMetersGet extends RequestOapi {
    path: {
        accountId: string;
    };
}

export type PathAccountsAccountIdMetersGet<R extends Empty = Empty> = (req: RequestAccountsAccountIdMetersGet & R) => ResponseAccountsAccountIdMetersGet | Promise<ResponseAccountsAccountIdMetersGet>;
