import axiosClient from "./axiosClient";
import type { RepairIntakeReceipt, RepairIntakeRequest } from "../types/repairIntake";

export const createRepairIntakeApi = async (
    ticketId: number,
    data: RepairIntakeRequest,
    images: File[],
): Promise<RepairIntakeReceipt> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    images.forEach((image) => formData.append("images", image));
    const response = await axiosClient.post<RepairIntakeReceipt>(
        `/api/repair-tickets/${ticketId}/intake`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
};

export const getRepairIntakeApi = async (ticketId: number): Promise<RepairIntakeReceipt> => {
    const response = await axiosClient.get<RepairIntakeReceipt>(
        `/api/repair-tickets/${ticketId}/intake`,
    );
    return response.data;
};
