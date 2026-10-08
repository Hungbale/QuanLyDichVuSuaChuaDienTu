export interface Category {
    id: number;
    name: string;
    status: "ACTIVE" | "INACTIVE";
}

export interface CategoryRequest {
    name: string;
}