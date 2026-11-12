import axiosClient from "./axiosClient";
import { getMyEmployeeProfileApi } from "./employeeApi";
import type { RepairHistoryEntry, RepairTicket, RepairTicketRequest } from "../types/repairTicket";

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

export const createRepairTicketApi = async (data: RepairTicketRequest): Promise<RepairTicket> => {
    const response = await axiosClient.post<RepairTicket>("/api/repair-tickets", data);
    return response.data;
};

export const updateRepairTicketApi = async (id: number, data: RepairTicketRequest): Promise<RepairTicket> => {
    const response = await axiosClient.put<RepairTicket>(`/api/repair-tickets/${id}`, data);
    return response.data;
};
