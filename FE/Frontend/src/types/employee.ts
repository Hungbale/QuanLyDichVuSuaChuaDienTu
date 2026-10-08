export interface EmployeeUser {
    id: number;
    email: string;
    role: string;
}

export interface Employee {
    id: number;
    employeeCode: string;
    fullName: string;
    phone: string;
    status: "ACTIVE" | "LOCKED";
    user: EmployeeUser;
}

export interface EmployeeRequest {
    employeeCode: string;
    fullName: string;
    phone: string;
    email: string;
    password?: string;
}