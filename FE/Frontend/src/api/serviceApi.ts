import axiosClient from "./axiosClient";
import type {
    ServiceItem,
    ServiceItemRequest,
} from "../types/service";

export interface ServiceSearchParams {
    keyword?: string;
    status?: string;
    categoryId?: number;
}

export const getServicesApi = async (
    params?: ServiceSearchParams
): Promise<ServiceItem[]> => {
    const response = await axiosClient.get<ServiceItem[]>(
        "/api/services",
        {
            params,
        }
    );

    return response.data;
};

export const getServiceByIdApi = async (
    id: number
): Promise<ServiceItem> => {
    const response = await axiosClient.get<ServiceItem>(
        `/api/services/${id}`
    );

    return response.data;
};

export const createServiceApi = async (
    data: ServiceItemRequest
): Promise<ServiceItem> => {
    const response = await axiosClient.post<ServiceItem>(
        "/api/services",
        data
    );

    return response.data;
};

export const updateServiceApi = async (
    id: number,
    data: ServiceItemRequest
): Promise<ServiceItem> => {
    const response = await axiosClient.put<ServiceItem>(
        `/api/services/${id}`,
        data
    );

    return response.data;
};

export const changeServiceStatusApi = async (
    id: number
): Promise<ServiceItem> => {
    const response = await axiosClient.patch<ServiceItem>(
        `/api/services/${id}/status`
    );

    return response.data;
};

export const deleteServiceApi = async (
    id: number
) => {
    const response = await axiosClient.delete(
        `/api/services/${id}`
    );

    return response.data;
};