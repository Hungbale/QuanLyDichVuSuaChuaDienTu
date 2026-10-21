import axiosClient from "./axiosClient";
import type { RepairQuote, RepairQuoteRequest } from "../types/repairQuote";

export const createRepairQuoteApi = async (ticketId: number, data: RepairQuoteRequest): Promise<RepairQuote> => {
    const response = await axiosClient.post<RepairQuote>(`/api/repair-tickets/${ticketId}/quote`, data);
    return response.data;
};

export const getRepairQuoteApi = async (ticketId: number): Promise<RepairQuote> => {
    const response = await axiosClient.get<RepairQuote>(`/api/repair-tickets/${ticketId}/quote`);
    return response.data;
};

export const decideRepairQuoteApi = async (quoteId: number, decision: "ACCEPTED" | "REJECTED"): Promise<RepairQuote> => {
    const response = await axiosClient.patch<RepairQuote>(`/api/quotes/${quoteId}/decision`, { decision });
    return response.data;
};
