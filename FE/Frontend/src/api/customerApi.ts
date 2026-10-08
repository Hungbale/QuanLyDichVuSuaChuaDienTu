import axiosClient from "./axiosClient";
import type {
    Customer,
    CustomerRequest,
} from "../types/customer";

export interface CustomerSearchParams {
    keyword?: string;
    status?: string;
}

export const getCustomersApi = async (
    params?: CustomerSearchParams
): Promise<Customer[]> => {
    const response = await axiosClient.get<Customer[]>(
        "/api/customers",
        {
            params,
        }
    );

    return response.data;
};

export const getCustomerByIdApi = async (
    id: number
): Promise<Customer> => {
    const response = await axiosClient.get<Customer>(
        `/api/customers/${id}`
    );

    return response.data;
};

export const createCustomerApi = async (
    data: CustomerRequest
): Promise<Customer> => {
    const response = await axiosClient.post<Customer>(
        "/api/customers",
        data
    );

    return response.data;
};

export const updateCustomerApi = async (
    id: number,
    data: CustomerRequest
): Promise<Customer> => {
    const response = await axiosClient.put<Customer>(
        `/api/customers/${id}`,
        data
    );

    return response.data;
};

export const changeCustomerStatusApi = async (
    id: number
): Promise<Customer> => {
    const response = await axiosClient.patch<Customer>(
        `/api/customers/${id}/status`
    );

    return response.data;
};