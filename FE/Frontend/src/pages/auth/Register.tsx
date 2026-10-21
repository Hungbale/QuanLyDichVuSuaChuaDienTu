import { useState } from "react";
import type {
    ChangeEvent,
    FormEvent,
} from "react";
import {
    Link,
    useNavigate,
} from "react-router-dom";

import {
    Eye,
    EyeOff,
    Lock,
    Mail,
    MapPin,
    Phone,
    User,
} from "lucide-react";

import { registerApi } from "../../api/authApi";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^0\d{9}$/;

function getRegistrationErrorMessage(error: unknown): string {
    const requestError = error as {
        message?: string;
        code?: string;
        response?: { status?: number; data?: unknown };
        request?: unknown;
    };
    const status = requestError.response?.status;
    const responseData = requestError.response?.data;
    let detail = "";

    if (typeof responseData === "string") {
        detail = responseData.trim();
    } else if (responseData && typeof responseData === "object") {
        const body = responseData as Record<string, unknown>;
        const message = body.message ?? body.detail ?? body.title;

        if (typeof message === "string" && message.trim()) {
            detail = message.trim();
        } else if (Array.isArray(body.errors)) {
            detail = body.errors
                .map((item) => {
                    if (typeof item === "string") return item;
                    if (item && typeof item === "object") {
                        const validationError = item as Record<string, unknown>;
                        return validationError.defaultMessage ?? validationError.message;
                    }
                    return "";
                })
                .filter((item): item is string => typeof item === "string" && Boolean(item))
                .join(" ");
        } else if (body.errors && typeof body.errors === "object") {
            detail = Object.values(body.errors as Record<string, unknown>)
                .flatMap((value) => Array.isArray(value) ? value : [value])
                .filter((value): value is string => typeof value === "string")
                .join(" ");
        }
    }

    if (detail) {
        return status
            ? `Đăng ký thất bại (HTTP ${status}): ${detail}`
            : `Đăng ký thất bại: ${detail}`;
    }
    if (status === 400) {
        return "Máy chủ từ chối thông tin đăng ký (HTTP 400). Hãy kiểm tra email, mật khẩu, họ tên, số điện thoại 10 chữ số bắt đầu bằng 0 và địa chỉ.";
    }
    if (status === 409) {
        return "Email hoặc số điện thoại này đã được đăng ký (HTTP 409). Hãy dùng thông tin khác.";
    }
    if (status === 404) {
        return "Không tìm thấy API đăng ký (HTTP 404). Kiểm tra đường dẫn API và backend đang chạy.";
    }
    if (status && status >= 500) {
        return `Backend gặp lỗi khi tạo tài khoản (HTTP ${status}). Kiểm tra log backend và kết nối cơ sở dữ liệu.`;
    }
    if (status) {
        return `Đăng ký thất bại (HTTP ${status}). ${requestError.message || "Backend không chấp nhận yêu cầu."}`;
    }
    if (requestError.code === "ERR_NETWORK" || requestError.request) {
        return "Không kết nối được tới backend. Kiểm tra backend có đang chạy tại VITE_API_URL và cho phép kết nối từ frontend không.";
    }

    return `Không thể gửi yêu cầu đăng ký. ${requestError.message || "Vui lòng thử lại."}`;
}

function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "",
        phone: "",
        address: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // =========================
    // HANDLE INPUT
    // =========================

    const handleChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        // Xóa thông báo lỗi khi người dùng bắt đầu sửa
        if (error) {
            setError("");
        }
    };

    // =========================
    // SUBMIT REGISTER
    // =========================

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        // =========================
        // TRIM DỮ LIỆU
        // =========================

        const fullNameValue = form.fullName.trim();
        const emailValue = form.email.trim();
        const phoneValue = form.phone.trim();
        const addressValue = form.address.trim();

        // =========================
        // VALIDATE HỌ TÊN
        // =========================

        if (!fullNameValue) {
            setError("Vui lòng nhập họ và tên.");
            return;
        }

        // =========================
        // VALIDATE EMAIL
        // =========================

        if (!emailValue) {
            setError("Vui lòng nhập email.");
            return;
        }

        if (!emailRegex.test(emailValue)) {
            setError(
                "Email không đúng định dạng. Vui lòng nhập lại."
            );
            return;
        }

        // =========================
        // VALIDATE SỐ ĐIỆN THOẠI
        // =========================

        if (!phoneValue) {
            setError("Vui lòng nhập số điện thoại.");
            return;
        }

        if (!phoneRegex.test(phoneValue)) {
            setError(
                "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0."
            );
            return;
        }

        // =========================
        // VALIDATE ĐỊA CHỈ
        // =========================

        if (!addressValue) {
            setError("Vui lòng nhập địa chỉ.");
            return;
        }

        // =========================
        // VALIDATE MẬT KHẨU
        // =========================

        if (!form.password) {
            setError("Vui lòng nhập mật khẩu.");
            return;
        }

        if (form.password.length < 6) {
            setError(
                "Mật khẩu phải có ít nhất 6 ký tự."
            );
            return;
        }

        // =========================
        // VALIDATE XÁC NHẬN MẬT KHẨU
        // =========================

        if (!form.confirmPassword) {
            setError(
                "Vui lòng xác nhận mật khẩu."
            );
            return;
        }

        if (
            form.password !==
            form.confirmPassword
        ) {
            setError(
                "Mật khẩu xác nhận không khớp."
            );
            return;
        }

        // =========================
        // GỌI API
        // =========================

        setLoading(true);

        try {
            await registerApi({
                email: emailValue,
                password: form.password,
                confirmPassword:
                    form.confirmPassword,
                fullName: fullNameValue,
                phone: phoneValue,
                address: addressValue,
            });

            // =========================
            // ĐĂNG KÝ THÀNH CÔNG
            // =========================

            setSuccess(
                "Đăng ký tài khoản thành công. Đang chuyển đến trang đăng nhập..."
            );

            setTimeout(() => {
                navigate("/login");
            }, 1200);

        } catch (error: any) {
            console.error(error);

            setError(getRegistrationErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page register-page">

            <div className="auth-container">

                {/* LOGO / BRAND */}
                <div className="auth-brand">

                    <div className="auth-logo">
                        FIXHUB
                    </div>

                    <h1>
                        Quản lý dịch vụ sửa chữa máy tính
                    </h1>

                    <p>
                        Tạo tài khoản để sử dụng dịch vụ
                        sửa chữa máy tính.
                    </p>

                </div>

                {/* REGISTER CARD */}
                <div className="auth-card register-card">

                    <div className="auth-card-header">

                        <h2>
                            Đăng ký tài khoản
                        </h2>

                        <p>
                            Nhập đầy đủ thông tin để tạo tài khoản
                        </p>

                    </div>

                    <form
                        className="auth-form"
                        onSubmit={handleSubmit}
                    >

                        {/* HỌ VÀ TÊN */}
                        <div className="auth-form-group">

                            <label htmlFor="fullName">
                                Họ và tên
                            </label>

                            <div className="auth-input-wrapper">

                                <User size={18} />

                                <input
                                    id="fullName"
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="Nhập họ và tên"
                                    autoComplete="name"
                                    required
                                />

                            </div>

                        </div>

                        {/* EMAIL */}
                        <div className="auth-form-group">

                            <label htmlFor="email">
                                Email
                            </label>

                            <div className="auth-input-wrapper">

                                <Mail size={18} />

                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="example@gmail.com"
                                    autoComplete="email"
                                    required
                                />

                            </div>

                        </div>

                        {/* SỐ ĐIỆN THOẠI */}
                        <div className="auth-form-group">

                            <label htmlFor="phone">
                                Số điện thoại
                            </label>

                            <div className="auth-input-wrapper">

                                <Phone size={18} />

                                <input
                                    id="phone"
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="0912345678"
                                    autoComplete="tel"
                                    maxLength={10}
                                    required
                                />

                            </div>

                        </div>

                        {/* ĐỊA CHỈ */}
                        <div className="auth-form-group">

                            <label htmlFor="address">
                                Địa chỉ
                            </label>

                            <div className="auth-input-wrapper">

                                <MapPin size={18} />

                                <input
                                    id="address"
                                    type="text"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    placeholder="Nhập địa chỉ"
                                    autoComplete="street-address"
                                    required
                                />

                            </div>

                        </div>

                        {/* MẬT KHẨU */}
                        <div className="auth-form-group">

                            <label htmlFor="password">
                                Mật khẩu
                            </label>

                            <div className="auth-input-wrapper">

                                <Lock size={18} />

                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Ít nhất 6 ký tự"
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (previous) =>
                                                !previous
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Ẩn mật khẩu"
                                            : "Hiện mật khẩu"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>

                            </div>

                        </div>

                        {/* XÁC NHẬN MẬT KHẨU */}
                        <div className="auth-form-group">

                            <label htmlFor="confirmPassword">
                                Xác nhận mật khẩu
                            </label>

                            <div className="auth-input-wrapper">

                                <Lock size={18} />

                                <input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="confirmPassword"
                                    value={
                                        form.confirmPassword
                                    }
                                    onChange={handleChange}
                                    placeholder="Nhập lại mật khẩu"
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (previous) =>
                                                !previous
                                        )
                                    }
                                    aria-label={
                                        showConfirmPassword
                                            ? "Ẩn mật khẩu"
                                            : "Hiện mật khẩu"
                                    }
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>

                            </div>

                        </div>

                        {/* ERROR */}
                        {error && (
                            <div className="auth-error" role="alert" aria-live="polite">
                                {error}
                            </div>
                        )}

                        {/* SUCCESS */}
                        {success && (
                            <div className="auth-success">
                                {success}
                            </div>
                        )}

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            className="auth-submit-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Đang đăng ký..."
                                : "Đăng ký"}
                        </button>

                    </form>

                    {/* LOGIN LINK */}
                    <div className="auth-footer">

                        <span>
                            Đã có tài khoản?
                        </span>

                        <Link to="/login">
                            Đăng nhập
                        </Link>

                    </div>

                </div>

                <div className="auth-copyright">
                    © 2026 FIXHUB. All rights reserved.
                </div>

            </div>

        </div>
    );
}

export default Register;
