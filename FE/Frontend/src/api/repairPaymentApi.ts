import axiosClient from "./axiosClient";
import type { RepairPayment, RepairPaymentMethod } from "../types/repairPayment";

export const createRepairPaymentApi = async (ticketId: number, method: RepairPaymentMethod): Promise<RepairPayment> => {
    const response = await axiosClient.post<RepairPayment>(`/api/repair-tickets/${ticketId}/payments`, { method });
    return response.data;
};

export const getRepairPaymentsApi = async (ticketId: number): Promise<RepairPayment[]> => {
    const response = await axiosClient.get<RepairPayment[]>(`/api/repair-tickets/${ticketId}/payments`);
    return response.data;
};

export const confirmRepairPaymentApi = async (paymentId: number): Promise<RepairPayment> => {
    const response = await axiosClient.patch<RepairPayment>(`/api/payments/${paymentId}/confirm`);
    return response.data;
};
