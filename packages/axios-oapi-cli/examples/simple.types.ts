import { AxiosRequestConfig, AxiosInstance } from "axios";

export const axiosOapi = (api: AxiosInstance) => ({
    "POST /test/{id}": (id: string, data: User, config?: AxiosRequestConfig) => api.post<Test>(`/test/${id}`, data, config),
    "GET /test/{id}": (id: string, config?: AxiosRequestConfig) => api.get<Test>(`/test/${id}`, config),
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
