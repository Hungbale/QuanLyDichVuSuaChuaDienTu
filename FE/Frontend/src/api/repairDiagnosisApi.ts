import axiosClient from "./axiosClient";
import type { RepairDiagnosis, RepairDiagnosisRequest } from "../types/repairDiagnosis";

export const getRepairDiagnosisApi = async (ticketId: number): Promise<RepairDiagnosis> => {
    const response = await axiosClient.get<RepairDiagnosis>(`/api/repair-tickets/${ticketId}/diagnosis`);
    return response.data;
};

export const saveRepairDiagnosisApi = async (ticketId: number, request: RepairDiagnosisRequest): Promise<RepairDiagnosis> => {
    const response = await axiosClient.put<RepairDiagnosis>(`/api/repair-tickets/${ticketId}/diagnosis`, request);
    return response.data;
};
