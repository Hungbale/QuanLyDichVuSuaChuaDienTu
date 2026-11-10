import axiosClient from "./axiosClient";
import type { WarrantyRequest, WarrantyRequestCreate } from "../types/warrantyRequest";

export const getMyWarrantyRequestsApi = async (): Promise<WarrantyRequest[]> => {
    const response = await axiosClient.get<WarrantyRequest[]>("/api/warranty-requests/me");
    return response.data;
};

export const getWarrantyRequestsApi = async (status?: string): Promise<WarrantyRequest[]> => {
    const response = await axiosClient.get<WarrantyRequest[]>("/api/warranty-requests", {
        params: status ? { status } : undefined,
    });
    return response.data;
};

export const processWarrantyRequestApi = async (
    id: number,
    status: "APPROVED" | "REJECTED" | "COMPLETED",
    resolutionNote?: string,
): Promise<WarrantyRequest> => {
    const response = await axiosClient.patch<WarrantyRequest>(`/api/warranty-requests/${id}/process`, {
        status,
        ...(resolutionNote?.trim() ? { resolutionNote: resolutionNote.trim() } : {}),
    });
    return response.data;
};

export const downloadWarrantyAttachmentApi = async (id: number): Promise<Blob> => {
    const response = await axiosClient.get<Blob>(`/api/warranty-requests/${id}/attachment`, {
        responseType: "blob",
    });
    return response.data;
};

export const createWarrantyRequestApi = async (request: WarrantyRequestCreate): Promise<WarrantyRequest> => {
    const form = new FormData();
    form.append("ticketCode", request.ticketCode);
    form.append("reason", request.reason);
    if (request.description?.trim()) form.append("description", request.description.trim());
    if (request.attachment) form.append("attachment", request.attachment);

    const response = await axiosClient.post<WarrantyRequest>("/api/warranty-requests", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
};
