import { AxiosRequestConfig, AxiosInstance, AxiosResponse } from "axios";

export const axiosOapi = (api: AxiosInstance): AxiosOapiInstance => ({
    /**
     * Add a new pet to the store
     */
    "POST /pet": (data, config) => api.post(`/pet`, data, config),
    /**
     * Update an existing pet
     */
    "PUT /pet": (data, config) => api.put<Pet>(`/pet`, data, config),
    /**
     * Finds Pets by status
     * Multiple status values can be provided with comma separated strings
     */
    "GET /pet/findByStatus": config => api.get<Pet[]>(`/pet/findByStatus`, config),
    /**
     * Finds Pets by tags
     * Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     */
    "GET /pet/findByTags": config => api.get<Pet[]>(`/pet/findByTags`, config),
    /**
     * Find pet by ID
     * Returns a single pet
     */
    "GET /pet/{petId}": (petId, config) => api.get<Pet>(`/pet/${petId}`, config),
    /**
     * Updates a pet in the store with form data
     */
    "POST /pet/{petId}": (petId, data, config) => api.post(`/pet/${petId}`, data, config),
    /**
     * Deletes a pet
     */
    "DELETE /pet/{petId}": (petId, config) => api.delete(`/pet/${petId}`, config),
    /**
     * uploads an image
     */
    "POST /pet/{petId}/uploadImage": (petId, data, config) => api.post<ApiResponse>(`/pet/${petId}/uploadImage`, data, config),
    /**
     * Returns pet inventories by status
     * Returns a map of status codes to quantities
     */
    "GET /store/inventory": config => api.get<any>(`/store/inventory`, config),
    /**
     * Place an order for a pet
     */
    "POST /store/order": (data, config) => api.post<Order>(`/store/order`, data, config),
    /**
     * Find purchase order by ID
     * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     */
    "GET /store/order/{orderId}": (orderId, config) => api.get<Order>(`/store/order/${orderId}`, config),
    /**
     * Delete purchase order by ID
     * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     */
    "DELETE /store/order/{orderId}": (orderId, config) => api.delete(`/store/order/${orderId}`, config),
    /**
     * Create user
     * This can only be done by the logged in user.
     */
    "POST /user": (data, config) => api.post(`/user`, data, config),
    /**
     * Creates list of users with given input array
     */
    "POST /user/createWithArray": (data, config) => api.post(`/user/createWithArray`, data, config),
    /**
     * Creates list of users with given input array
     */
    "POST /user/createWithList": (data, config) => api.post(`/user/createWithList`, data, config),
    /**
     * Logs user into the system
     */
    "GET /user/login": config => api.get<string>(`/user/login`, config),
    /**
     * Logs out current logged in user session
     */
    "GET /user/logout": config => api.get(`/user/logout`, config),
    /**
     * Get user by user name
     */
    "GET /user/{username}": (username, config) => api.get<User>(`/user/${username}`, config),
    /**
     * Updated user
     * This can only be done by the logged in user.
     */
    "PUT /user/{username}": (username, data, config) => api.put(`/user/${username}`, data, config),
    /**
     * Delete user
     * This can only be done by the logged in user.
     */
    "DELETE /user/{username}": (username, config) => api.delete(`/user/${username}`, config),
    api: api
});

export interface Pet {
    id?: number;
    category?: Category;
    name: string;
    photoUrls: string[];
    tags?: Tag[];
    /**
     * pet status in the store
     */
    status?: "available" | "pending" | "sold";
    [key: string]: unknown;
}

export interface Category {
    id?: number;
    name?: string;
    [key: string]: unknown;
}

export interface Tag {
    id?: number;
    name?: string;
    [key: string]: unknown;
}

export interface GetPetFindByStatus {
    params?: {
        /**
         * Status values that need to be considered for filter
         */
        status: ("available" | "pending" | "sold")[];
    };
}

export interface GetPetFindByTags {
    params?: {
        /**
         * Tags to filter by
         */
        tags: string[];
    };
}

export interface DeletePetPetId {
    headers?: {
        api_key?: string;
    };
}

export interface ApiResponse {
    code?: number;
    type?: string;
    message?: string;
    [key: string]: unknown;
}

export interface Order {
    id?: number;
    petId?: number;
    quantity?: number;
    shipDate?: string;
    /**
     * Order Status
     */
    status?: "placed" | "approved" | "delivered";
    complete?: boolean;
    [key: string]: unknown;
}

export interface User {
    id?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
    /**
     * User Status
     */
    userStatus?: number;
    [key: string]: unknown;
}

export interface GetUserLogin {
    params?: {
        /**
         * The user name for login
         */
        username: string;
        /**
         * The password for login in clear text
         */
        password: string;
    };
}

export interface AxiosOapiInstance {
    /**
     * Add a new pet to the store
     */
    "POST /pet": (data: Pet, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Update an existing pet
     */
    "PUT /pet": (data: Pet, config?: AxiosRequestConfig) => Promise<AxiosResponse<Pet>>;
    /**
     * Finds Pets by status
     * Multiple status values can be provided with comma separated strings
     */
    "GET /pet/findByStatus": (config?: AxiosRequestConfig & GetPetFindByStatus) => Promise<AxiosResponse<Pet[]>>;
    /**
     * Finds Pets by tags
     * Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     */
    "GET /pet/findByTags": (config?: AxiosRequestConfig & GetPetFindByTags) => Promise<AxiosResponse<Pet[]>>;
    /**
     * Find pet by ID
     * Returns a single pet
     */
    "GET /pet/{petId}": (petId: number, config?: AxiosRequestConfig) => Promise<AxiosResponse<Pet>>;
    /**
     * Updates a pet in the store with form data
     */
    "POST /pet/{petId}": (petId: number, data: unknown, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Deletes a pet
     */
    "DELETE /pet/{petId}": (petId: number, config?: AxiosRequestConfig & DeletePetPetId) => Promise<AxiosResponse>;
    /**
     * uploads an image
     */
    "POST /pet/{petId}/uploadImage": (petId: number, data: unknown, config?: AxiosRequestConfig) => Promise<AxiosResponse<ApiResponse>>;
    /**
     * Returns pet inventories by status
     * Returns a map of status codes to quantities
     */
    "GET /store/inventory": (config?: AxiosRequestConfig) => Promise<AxiosResponse<any>>;
    /**
     * Place an order for a pet
     */
    "POST /store/order": (data: Order, config?: AxiosRequestConfig) => Promise<AxiosResponse<Order>>;
    /**
     * Find purchase order by ID
     * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     */
    "GET /store/order/{orderId}": (orderId: number, config?: AxiosRequestConfig) => Promise<AxiosResponse<Order>>;
    /**
     * Delete purchase order by ID
     * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     */
    "DELETE /store/order/{orderId}": (orderId: number, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Create user
     * This can only be done by the logged in user.
     */
    "POST /user": (data: User, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Creates list of users with given input array
     */
    "POST /user/createWithArray": (data: User[], config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Creates list of users with given input array
     */
    "POST /user/createWithList": (data: User[], config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Logs user into the system
     */
    "GET /user/login": (config?: AxiosRequestConfig & GetUserLogin) => Promise<AxiosResponse<string>>;
    /**
     * Logs out current logged in user session
     */
    "GET /user/logout": (config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Get user by user name
     */
    "GET /user/{username}": (username: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<User>>;
    /**
     * Updated user
     * This can only be done by the logged in user.
     */
    "PUT /user/{username}": (username: string, data: User, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    /**
     * Delete user
     * This can only be done by the logged in user.
     */
    "DELETE /user/{username}": (username: string, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
    api: AxiosInstance;
}
