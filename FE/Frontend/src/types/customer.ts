export interface CustomerUser {
    id: number;
    email: string;
    role: string;
}

export interface Customer {
    id: number;
    customerCode: string;
    fullName: string;
    phone: string;
    address: string;
    repairCount: number;
    status: "ACTIVE" | "LOCKED";
    user: CustomerUser;
}

export interface CustomerRequest {
    customerCode: string;
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    address: string;
}