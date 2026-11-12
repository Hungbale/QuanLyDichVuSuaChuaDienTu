import axiosClient from "./axiosClient";
import type {
    Category,
    CategoryRequest,
} from "../types/category";

export const getCategoriesApi = async (
    status?: string
): Promise<Category[]> => {
    const response = await axiosClient.get<Category[]>(
        "/api/categories",
        {
            params: status ? { status } : {},
        }
    );

    return response.data;
};

export const getCategoryByIdApi = async (
    id: number
): Promise<Category> => {
    const response = await axiosClient.get<Category>(
        `/api/categories/${id}`
    );

    return response.data;
};

export const createCategoryApi = async (
    data: CategoryRequest
): Promise<Category> => {
    const response = await axiosClient.post<Category>(
        "/api/categories",
        data
    );

    return response.data;
};

export const updateCategoryApi = async (
    id: number,
    data: CategoryRequest
): Promise<Category> => {
    const response = await axiosClient.put<Category>(
        `/api/categories/${id}`,
        data
    );

    return response.data;
};

export const changeCategoryStatusApi = async (
    id: number
): Promise<Category> => {
    const response = await axiosClient.patch<Category>(
        `/api/categories/${id}/status`
    );

    return response.data;
};

export const deleteCategoryApi = async (
    id: number
) => {
    const response = await axiosClient.delete(
        `/api/categories/${id}`
    );

    return response.data;
};