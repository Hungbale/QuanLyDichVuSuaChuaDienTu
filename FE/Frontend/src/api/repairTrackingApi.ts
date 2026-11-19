import axiosClient from "./axiosClient";
import type { RepairTrackingDetails } from "../types/repairTracking";

export const getRepairTrackingApi = async (ticketId: number): Promise<RepairTrackingDetails> => {
    const response = await axiosClient.get<RepairTrackingDetails>(`/api/repair-tickets/${ticketId}/tracking`);
    return response.data;
};
