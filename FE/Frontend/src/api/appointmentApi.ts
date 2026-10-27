import axiosClient from "./axiosClient";
import type {
    Appointment,
    AssignedAppointment,
    AssignedAppointmentGroups,
    AppointmentRequest,
    AppointmentSearchParams,
    AppointmentAvailability,
    AppointmentCancellationRequestRecord,
} from "../types/appointment";

export const getAppointmentsApi = async (
    params?: AppointmentSearchParams
): Promise<AssignedAppointment[]> => {
    const response = await axiosClient.get<AssignedAppointment[]>("/api/appointments", {
        params,
    });
    return response.data;
};

export const getMyAppointmentsApi = async (): Promise<Appointment[]> => {
    const response = await axiosClient.get<Appointment[]>("/api/appointments/me");
    return response.data;
};

export const getMyAssignedAppointmentsApi = async (): Promise<AssignedAppointment[]> => {
    const response = await axiosClient.get<AssignedAppointment[]>("/api/appointments/assigned/me");
    return response.data;
};

export const getMyAssignedAppointmentGroupsApi = async (): Promise<AssignedAppointmentGroups> => {
    const response = await axiosClient.get<AssignedAppointmentGroups>("/api/appointments/assigned/me/groups");
    return response.data;
};

export const getPendingAppointmentsApi = async (): Promise<AssignedAppointment[]> => {
    const response = await axiosClient.get<AssignedAppointment[]>("/api/appointments/pending");
    return response.data;
};

export const checkAppointmentAvailabilityApi = async (date: string, time: string): Promise<AppointmentAvailability> => {
    const response = await axiosClient.get<AppointmentAvailability>("/api/appointments/availability", { params: { date, time } });
    return response.data;
};

export const requestAppointmentCancellationApi = async (id: number, reason: string): Promise<AppointmentCancellationRequestRecord> => {
    const response = await axiosClient.post<AppointmentCancellationRequestRecord>(`/api/appointments/${id}/cancellation-request`, { reason });
    return response.data;
};

export const getAppointmentCancellationRequestsApi = async (): Promise<AppointmentCancellationRequestRecord[]> => {
    const response = await axiosClient.get<AppointmentCancellationRequestRecord[]>("/api/appointments/cancellation-requests");
    return response.data;
};

export const reviewAppointmentCancellationApi = async (id: number, decision: "APPROVE" | "REJECT"): Promise<AppointmentCancellationRequestRecord> => {
    const response = await axiosClient.patch<AppointmentCancellationRequestRecord>(`/api/appointments/${id}/cancellation`, { decision });
    return response.data;
};

export const assignAppointmentApi = async (id: number): Promise<Appointment> => {
    const response = await axiosClient.patch<Appointment>(`/api/appointments/${id}/assign`);
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
