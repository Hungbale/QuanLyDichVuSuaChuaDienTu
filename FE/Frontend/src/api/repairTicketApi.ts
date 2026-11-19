import axiosClient from "./axiosClient";
import { getMyEmployeeProfileApi } from "./employeeApi";
import type { RepairHistoryEntry, RepairTicket, RepairTicketActivity, RepairTicketRequest } from "../types/repairTicket";

export const getRepairTicketsApi = async (keyword?: string): Promise<RepairTicket[]> => {
    const response = await axiosClient.get<RepairTicket[]>("/api/repair-tickets", {
        params: keyword?.trim() ? { keyword: keyword.trim() } : undefined,
    });
    return response.data;
};

export const getMyAssignedRepairTicketsApi = async (keyword?: string): Promise<RepairTicket[]> => {
    const [employee, tickets] = await Promise.all([
        getMyEmployeeProfileApi(),
        getRepairTicketsApi(keyword),
    ]);
    return tickets.filter((ticket) => ticket.technicianId === employee.id);
};

export const getMyRepairHistoryApi = async (): Promise<RepairHistoryEntry[]> => {
    const response = await axiosClient.get<RepairHistoryEntry[]>("/api/repair-tickets/history/me");
    return response.data;
};

export const getRepairTicketApi = async (id: number): Promise<RepairTicket> => {
    const response = await axiosClient.get<RepairTicket>(`/api/repair-tickets/${id}`);
    return response.data;
};

export const getRepairTicketHistoryApi = async (id: number): Promise<RepairTicketActivity[]> => {
    const response = await axiosClient.get<RepairTicketActivity[]>(`/api/repair-tickets/${id}/history`);
    return response.data;
};

export const createRepairTicketApi = async (data: RepairTicketRequest): Promise<RepairTicket> => {
    const response = await axiosClient.post<RepairTicket>("/api/repair-tickets", data);
    return response.data;
};

export const updateRepairTicketApi = async (id: number, data: RepairTicketRequest): Promise<RepairTicket> => {
    const response = await axiosClient.put<RepairTicket>(`/api/repair-tickets/${id}`, data);
    return response.data;
};

export const updateRepairTicketStatusApi = async (
    id: number,
    status: string,
    images: File[],
    note?: string,
): Promise<void> => {
    const formData = new FormData();
    formData.append("status", status);
    if (note?.trim()) formData.append("note", note.trim());
    images.forEach((image) => formData.append("images", image));
    await axiosClient.patch(`/api/repair-tickets/${id}/status`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};
