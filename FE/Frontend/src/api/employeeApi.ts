import axiosClient from "./axiosClient";
import type {
    Employee,
    EmployeeRequest,
} from "../types/employee";

export interface EmployeeSearchParams {
    keyword?: string;
}

export const getEmployeesApi = async (
    params?: EmployeeSearchParams
): Promise<Employee[]> => {
    const response = await axiosClient.get<Employee[]>(
        "/api/employees",
        {
            params,
        }
    );

    return response.data;
};

export const getEmployeeByIdApi = async (
    id: number
): Promise<Employee> => {
    const response = await axiosClient.get<Employee>(
        `/api/employees/${id}`
    );

    return response.data;
};

export const createEmployeeApi = async (
    data: EmployeeRequest
): Promise<Employee> => {
    const response = await axiosClient.post<Employee>(
        "/api/employees",
        data
    );

    return response.data;
};

export const updateEmployeeApi = async (
    id: number,
    data: EmployeeRequest
): Promise<Employee> => {
    const response = await axiosClient.put<Employee>(
        `/api/employees/${id}`,
        data
    );

    return response.data;
};

export const changeEmployeeStatusApi = async (
    id: number
): Promise<Employee> => {
    const response = await axiosClient.patch<Employee>(
        `/api/employees/${id}/status`
    );

    return response.data;
};

export const deleteEmployeeApi = async (
    id: number
) => {
    const response = await axiosClient.delete(
        `/api/employees/${id}`
    );

    return response.data;
};