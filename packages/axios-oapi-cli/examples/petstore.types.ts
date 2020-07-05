import { AxiosRequestConfig, AxiosInstance } from "axios";

export const axiosOapi = (api: AxiosInstance) => ({
    /**
     * Add a new pet to the store
     */
    "POST /pet": (data: Pet, config?: AxiosRequestConfig) => api.post(`/pet`, data, config),
    /**
     * Update an existing pet
     */
    "PUT /pet": (data: Pet, config?: AxiosRequestConfig) => api.put<Pet>(`/pet`, data, config),
    /**
     * Finds Pets by status
     * Multiple status values can be provided with comma separated strings
     */
    "GET /pet/findByStatus": (config?: AxiosRequestConfig & GetPetFindByStatus) => api.get<Pet[]>(`/pet/findByStatus`, config),
    /**
     * Finds Pets by tags
     * Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     */
    "GET /pet/findByTags": (config?: AxiosRequestConfig & GetPetFindByTags) => api.get<Pet[]>(`/pet/findByTags`, config),
    /**
     * Find pet by ID
     * Returns a single pet
     */
    "GET /pet/{petId}": (petId: number, config?: AxiosRequestConfig) => api.get<Pet>(`/pet/${petId}`, config),
    /**
     * Updates a pet in the store with form data
     */
    "POST /pet/{petId}": (petId: number, data: unknown, config?: AxiosRequestConfig) => api.post(`/pet/${petId}`, data, config),
    /**
     * Deletes a pet
     */
    "DELETE /pet/{petId}": (petId: number, config?: AxiosRequestConfig & DeletePetPetId) => api.delete(`/pet/${petId}`, config),
    /**
     * uploads an image
     */
    "POST /pet/{petId}/uploadImage": (petId: number, data: unknown, config?: AxiosRequestConfig) => api.post<ApiResponse>(`/pet/${petId}/uploadImage`, data, config),
    /**
     * Returns pet inventories by status
     * Returns a map of status codes to quantities
     */
    "GET /store/inventory": (config?: AxiosRequestConfig) => api.get<any>(`/store/inventory`, config),
    /**
     * Place an order for a pet
     */
    "POST /store/order": (data: Order, config?: AxiosRequestConfig) => api.post<Order>(`/store/order`, data, config),
    /**
     * Find purchase order by ID
     * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     */
    "GET /store/order/{orderId}": (orderId: number, config?: AxiosRequestConfig) => api.get<Order>(`/store/order/${orderId}`, config),
    /**
     * Delete purchase order by ID
     * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     */
    "DELETE /store/order/{orderId}": (orderId: number, config?: AxiosRequestConfig) => api.delete(`/store/order/${orderId}`, config),
    /**
     * Create user
     * This can only be done by the logged in user.
     */
    "POST /user": (data: User, config?: AxiosRequestConfig) => api.post(`/user`, data, config),
    /**
     * Creates list of users with given input array
     */
    "POST /user/createWithArray": (data: User[], config?: AxiosRequestConfig) => api.post(`/user/createWithArray`, data, config),
    /**
     * Creates list of users with given input array
     */
    "POST /user/createWithList": (data: User[], config?: AxiosRequestConfig) => api.post(`/user/createWithList`, data, config),
    /**
     * Logs user into the system
     */
    "GET /user/login": (config?: AxiosRequestConfig & GetUserLogin) => api.get<string>(`/user/login`, config),
    /**
     * Logs out current logged in user session
     */
    "GET /user/logout": (config?: AxiosRequestConfig) => api.get(`/user/logout`, config),
    /**
     * Get user by user name
     */
    "GET /user/{username}": (username: string, config?: AxiosRequestConfig) => api.get<User>(`/user/${username}`, config),
    /**
     * Updated user
     * This can only be done by the logged in user.
     */
    "PUT /user/{username}": (username: string, data: User, config?: AxiosRequestConfig) => api.put(`/user/${username}`, data, config),
    /**
     * Delete user
     * This can only be done by the logged in user.
     */
    "DELETE /user/{username}": (username: string, config?: AxiosRequestConfig) => api.delete(`/user/${username}`, config),
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
    query: {
        /**
         * Status values that need to be considered for filter
         */
        status: ("available" | "pending" | "sold")[];
    };
}

export interface GetPetFindByTags {
    query: {
        /**
         * Tags to filter by
         */
        tags: string[];
    };
}

export interface DeletePetPetId {
    header: {
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
    query: {
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
