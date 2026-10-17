import type { ServiceItem } from "./service";

export type AppointmentServiceMethod = "STORE_DROP_OFF" | "HOME_PICKUP";

export interface AppointmentRequest {
    device: string;
    serviceId: number;
    appointmentDate: string;
    appointmentTime: string;
    serviceMethod: AppointmentServiceMethod;
    contactPhone: string;
    problemDescription: string;
    pickupAddress?: string;
}

export interface Appointment {
    id: number;
    device: string;
    service: ServiceItem;
    appointmentDate: string;
    appointmentTime: string;
    serviceMethod: AppointmentServiceMethod;
    contactPhone: string;
    problemDescription: string;
    pickupAddress: string | null;
    status: string;
    createdAt: string;
}

export interface AppointmentSearchParams {
    contactPhone?: string;
}
