import { AxiosRequestConfig, AxiosInstance, AxiosResponse } from "axios";

/**
 * Test
 *
 * Version: 1.0.0
 */
export const axiosOapi = (api: AxiosInstance): AxiosOapiInstance => ({
    "POST /test/{id}": (id, data, config) => api.post<Test>(`/test/${id}`, data, config),
    "GET /test/{id}": (id, config) => api.get<Test>(`/test/${id}`, config),
    api: api
});

export interface User {
    email: string;
    scopes?: string[];
}

export interface Test {
    text: string;
    user?: User;
    [key: string]: unknown;
}

export interface AxiosOapiInstance {
    "POST /test/{id}": (id: string, data: User, config?: AxiosRequestConfig) => Promise<AxiosResponse<Test>>;
    "GET /test/{id}": (id: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<Test>>;
    api: AxiosInstance;
}
