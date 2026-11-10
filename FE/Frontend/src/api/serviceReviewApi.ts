import axiosClient from "./axiosClient";
import type { ServiceReview, ServiceReviewRequest } from "../types/serviceReview";

export const getMyServiceReviewsApi = async (): Promise<ServiceReview[]> => {
    const response = await axiosClient.get<ServiceReview[]>("/api/reviews/me");
    return response.data;
};

export const getAllServiceReviewsApi = async (): Promise<ServiceReview[]> => {
    const response = await axiosClient.get<ServiceReview[]>("/api/reviews");
    return response.data;
};

export const createServiceReviewApi = async (ticketId: number, request: ServiceReviewRequest): Promise<ServiceReview> => {
    const response = await axiosClient.post<ServiceReview>(`/api/repair-tickets/${ticketId}/reviews`, request);
    return response.data;
};
