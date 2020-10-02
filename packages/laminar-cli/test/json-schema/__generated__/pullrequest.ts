export type Type = {
    id: number;
    title: string;
    repository?: repository;
    author?: user;
    [key: string]: unknown;
};

export interface repository {
    slug?: string;
    owner?: user;
    [key: string]: unknown;
}

export interface user {
    username?: string;
    uuid?: string;
    [key: string]: unknown;
}
