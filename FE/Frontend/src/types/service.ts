import type { Category } from "./category";

export interface ServiceItem {
    id: number;
    serviceCode: string;
    name: string;
    category: Category;
    price: number;
    description: string | null;
    status: "ACTIVE" | "INACTIVE";
}

export interface ServiceItemRequest {
    name: string;
    categoryId: number;
    price: number;
    description?: string;
}