import { AxiosRequestConfig, AxiosInstance, AxiosResponse } from "axios";

/**
 * Data Loader
 *
 * Version: 1.0.0
 *
 * Description:
 * An app for loading data from different sources
 */
export const axiosOapi = (api: AxiosInstance): AxiosOapiInstance => ({
    /**
     * Health Check
     * Health check endpoint
     */
    "GET /.well-known/health-check": config => api.get<HealthCheck>(`/.well-known/health-check`, config),
    /**
     * API Docs
     * The open api spec for the service. OpenAPI v3.
     */
    "GET /.well-known/openapi.yaml": config => api.get(`/.well-known/openapi.yaml`, config),
    /**
     * Meter Reads
     * Retern meter reads
     */
    "GET /v1/meter-reads": config => api.get<MeterRead[]>(`/v1/meter-reads`, config),
    /**
     * Meter reads csv upload
     * Upload a csv meter reads.
     *
     */
    "POST /v1/hydration/meter-reads": (data, config) => api.post<{
        success: boolean;
    }>(`/v1/hydration/meter-reads`, data, config),
    api: api
});

export interface HealthCheck {
    healthy: boolean;
}

export interface MeterRead {
    serialNumber: string;
    value: string;
    date: string;
}

export interface GetV1Meterreads {
    headers?: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
    params?: {
        /**
         * Filter by serial number
         */
        serialNumber?: string;
        /**
         * Filter by date
         */
        date?: string;
    };
}

export interface PostV1HydrationMeterreads {
    headers?: {
        /**
         * An optional trace token to be passed to the service and used for logging
         */
        "x-trace-token"?: string;
    };
}

export interface AxiosOapiInstance {
    /**
     * Health Check
     * Health check endpoint
     */
    "GET /.well-known/health-check": (config?: AxiosRequestConfig) => Promise<AxiosResponse<HealthCheck>>;
    /**
     * API Docs
     * The open api spec for the service. OpenAPI v3.
     */
    "GET /.well-known/openapi.yaml": (config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Meter Reads
     * Retern meter reads
     */
    "GET /v1/meter-reads": (config?: AxiosRequestConfig & GetV1Meterreads) => Promise<AxiosResponse<MeterRead[]>>;
    /**
     * Meter reads csv upload
     * Upload a csv meter reads.
     *
     */
    "POST /v1/hydration/meter-reads": (data?: unknown, config?: AxiosRequestConfig & PostV1HydrationMeterreads) => Promise<AxiosResponse<{
        success: boolean;
    }>>;
    api: AxiosInstance;
}
