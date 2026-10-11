export interface UserInfo {
    id: number;
    email: string;
    role: string;
    token: string;
    tokenType: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    tokenType: string;
    id: number;
    email: string;
    role: string;
    message: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    phone: string;
    address: string;
}

export interface RegisterResponse {
    id: number;
    email: string;
    role: string;
    message: string;
}
