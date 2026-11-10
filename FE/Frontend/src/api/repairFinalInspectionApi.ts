import axiosClient from "./axiosClient";
import type { RepairFinalInspection, RepairFinalInspectionRequest } from "../types/repairFinalInspection";

export const saveRepairFinalInspectionApi = async (
    ticketId: number,
    request: RepairFinalInspectionRequest,
): Promise<RepairFinalInspection> => {
    const response = await axiosClient.post<RepairFinalInspection>(
        `/api/repair-tickets/${ticketId}/final-inspection`,
        request,
    );
    return response.data;
};

export const getRepairFinalInspectionApi = async (ticketId: number): Promise<RepairFinalInspection> => {
    const response = await axiosClient.get<RepairFinalInspection>(
        `/api/repair-tickets/${ticketId}/final-inspection`,
    );
    return response.data;
};
