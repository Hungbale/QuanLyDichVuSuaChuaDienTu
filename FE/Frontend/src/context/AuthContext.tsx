import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { loginApi, logoutApi } from "../api/authApi";
import type { LoginRequest, UserInfo } from "../types/auth";

interface AuthContextType {
    user: UserInfo | null;
    isAuthenticated: boolean;
    login: (data: LoginRequest) => Promise<UserInfo>;
    logout: () => Promise<void>;
    updateUser: (data: Partial<UserInfo>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<UserInfo | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (token && savedUser) {
            try {
                const parsedUser: UserInfo = JSON.parse(savedUser);
                setUser(parsedUser);
            } catch {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
    }, []);

    const updateUser = (data: Partial<UserInfo>) => {
        setUser((previous) => {
            if (!previous) {
                return previous;
            }

            const updatedUser = {
                ...previous,
                ...data,
            };

            localStorage.setItem(
                "user",
                JSON.stringify(updatedUser)
            );

            return updatedUser;
        });
    };

    const login = async (
        data: LoginRequest
    ): Promise<UserInfo> => {
        const response = await loginApi(data);

        const userInfo: UserInfo = {
            id: response.id,
            email: response.email,
            role: response.role,
            token: response.token,
            tokenType: response.tokenType,
        };

        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(userInfo));

        setUser(userInfo);

        return userInfo;
    };

    const logout = async () => {
        try {
            await logoutApi();
        } catch {
            // Dù API logout lỗi, vẫn xóa session phía client
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth phải được sử dụng bên trong AuthProvider"
        );
    }

    return context;
}