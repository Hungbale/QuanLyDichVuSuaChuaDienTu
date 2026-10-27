import type { ServiceItem } from "./service";

export type AppointmentServiceMethod = "STORE_DROP_OFF" | "HOME_PICKUP";

export interface AppointmentRequest {
    device: string;
    serviceId: number;
    customerId?: number;
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
    technician?: AppointmentTechnician | null;
}

export interface AppointmentTechnician {
    id: number;
    employeeCode: string;
    fullName: string;
    phone: string;
}

export interface AssignedAppointment {
    id: number;
    customerId: number | null;
    customerName?: string | null;
    device: string;
    serviceId: number;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceMethod: AppointmentServiceMethod;
    contactPhone: string;
    problemDescription: string;
    pickupAddress: string | null;
    status: string;
}

export interface AssignedAppointmentGroups {
    actionRequired: AssignedAppointment[];
    received: AssignedAppointment[];
    other: AssignedAppointment[];
}

export interface AppointmentSearchParams {
    contactPhone?: string;
}

export interface AppointmentAvailability {
    date: string;
    time: string;
    available: boolean;
    remainingCapacity: number;
}

export interface AppointmentCancellationRequestRecord {
    appointmentId: number;
    customerId: number | null;
    customerName: string | null;
    device: string;
    appointmentDate: string;
    appointmentTime: string;
    repairTicketId: number | null;
    cancellationReason: string;
    status: string;
}
