import axiosClient from "./axiosClient";
import type {
    Appointment,
    AppointmentRequest,
    AppointmentSearchParams,
} from "../types/appointment";

export const getAppointmentsApi = async (
    params?: AppointmentSearchParams
): Promise<Appointment[]> => {
    const response = await axiosClient.get<Appointment[]>("/api/appointments", {
        params,
    });
    return response.data;
};

export const getMyAppointmentsApi = async (): Promise<Appointment[]> => {
    const response = await axiosClient.get<Appointment[]>("/api/appointments/me");
    return response.data;
};

export const createAppointmentApi = async (
    data: AppointmentRequest
): Promise<Appointment> => {
    const response = await axiosClient.post<Appointment>("/api/appointments", data);
    return response.data;
};

export const updateAppointmentApi = async (
    id: number,
    data: AppointmentRequest
): Promise<Appointment> => {
    const response = await axiosClient.put<Appointment>(`/api/appointments/${id}`, data);
    return response.data;
};

export const cancelAppointmentApi = async (id: number): Promise<void> => {
    await axiosClient.delete(`/api/appointments/${id}`);
};
