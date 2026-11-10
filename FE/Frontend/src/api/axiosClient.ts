import axios from "axios";
import { translateApiError, translateFieldError, translateValidationError } from "../utils/apiErrorMessage";

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const body = error.response?.data;

            if (body && typeof body === "object" && !Array.isArray(body)) {
                const responseBody = body as Record<string, unknown>;
                const sourceMessage = responseBody.message ?? responseBody.detail ?? responseBody.title;
                if (sourceMessage !== undefined) {
                    const translated = translateValidationError(sourceMessage);
                    responseBody.message = translated ?? translateApiError(sourceMessage, status);
                } else if (status) {
                    responseBody.message = translateApiError(undefined, status);
                }
                if (typeof responseBody.error === "string" && !/[À-ỹĐđ]/.test(responseBody.error)) {
                    responseBody.error = translateValidationError(responseBody.error)
                        ?? translateApiError(undefined, status);
                }
                if (Array.isArray(responseBody.errors)) {
                    responseBody.errors = responseBody.errors.map((item) => {
                        if (typeof item === "string") return translateValidationError(item) ?? item;
                        if (item && typeof item === "object") {
                            const validation = item as Record<string, unknown>;
                            for (const key of ["message", "defaultMessage"]) {
                                if (typeof validation[key] === "string") {
                                    validation[key] = translateValidationError(validation[key])
                                        ?? translateApiError(validation[key], status);
                                }
                            }
                        }
                        return item;
                    });
                }
                if (responseBody.errors && typeof responseBody.errors === "object" && !Array.isArray(responseBody.errors)) {
                    const fieldErrors = responseBody.errors as Record<string, unknown>;
                    for (const [field, value] of Object.entries(fieldErrors)) {
                        fieldErrors[field] = (Array.isArray(value) ? value : [value]).map((item) =>
                            translateFieldError(field, item) ?? (typeof item === "string" ? item : item)
                        );
                        if (Array.isArray(fieldErrors[field]) && fieldErrors[field].length === 1) {
                            fieldErrors[field] = fieldErrors[field][0];
                        }
                    }
                }
            } else if (error.response) {
                error.response.data = { message: translateApiError(body, status) };
            }

            if (!error.response) {
                error.message = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.";
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
