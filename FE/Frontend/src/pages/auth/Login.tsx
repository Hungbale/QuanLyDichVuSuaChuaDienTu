import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Eye,
    EyeOff,
    Lock,
    Mail,
    ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setError("");

        const emailValue = email.trim();

        // =========================
        // VALIDATE EMAIL
        // =========================
        if (!emailValue) {
            setError("Vui lòng nhập email.");
            return;
        }

        if (!emailRegex.test(emailValue)) {
            setError("Email không đúng định dạng. Vui lòng nhập lại.");
            return;
        }

        // =========================
        // VALIDATE PASSWORD
        // =========================
        if (!password) {
            setError("Vui lòng nhập mật khẩu.");
            return;
        }

        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        setLoading(true);

        try {
            const user = await login({
                email: emailValue,
                password,
            });

            // =========================
            // ĐIỀU HƯỚNG THEO ROLE
            // =========================
            if (user.role === "CUSTOMER") {
                navigate("/customer");
            } else if (user.role === "EMPLOYEE") {
                navigate("/employee");
            } else if (user.role === "ADMIN") {
                navigate("/admin");
            } else {
                navigate("/403");
            }
        } catch (error: any) {
            console.error(error);

            const message = error.response?.data?.message;

            if (message) {
                setError(message);
            } else {
                setError("Email hoặc mật khẩu không chính xác.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="liquid-login-page">
            {/* BACKGROUND LIGHTS */}
            <div className="liquid-orb liquid-orb-one" />
            <div className="liquid-orb liquid-orb-two" />
            <div className="liquid-orb liquid-orb-three" />

            {/* BACKGROUND GRID */}
            <div className="liquid-grid" />

            <div className="liquid-login-container">
                {/* BRAND */}
                <div className="liquid-brand">
                    <div className="liquid-logo">
                        FIXHUB
                    </div>

                    <h1>
                        Quản lý dịch vụ
                        <br />
                        sửa chữa máy tính
                    </h1>

                    <p>
                        Đăng nhập để sử dụng hệ thống
                        <br />
                        quản lý dịch vụ sửa chữa.
                    </p>
                </div>

                {/* GLASS CARD */}
                <div className="liquid-login-card">
                    {/* CARD SHINE */}
                    <div className="liquid-card-shine" />

                    <div className="liquid-card-content">
                        <div className="liquid-card-header">
                            <span className="liquid-card-label">
                                WELCOME BACK
                            </span>

                            <h2>
                                Đăng nhập
                            </h2>

                            <p>
                                Nhập thông tin tài khoản của bạn
                            </p>
                        </div>

                        <form
                            className="liquid-login-form"
                            onSubmit={handleSubmit}
                        >
                            {/* EMAIL */}
                            <div className="liquid-form-group">
                                <label htmlFor="email">
                                    Email
                                </label>

                                <div className="liquid-input-wrapper">
                                    <Mail size={18} />

                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        placeholder="Nhập email"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            {/* PASSWORD */}
                            <div className="liquid-form-group">
                                <label htmlFor="password">
                                    Mật khẩu
                                </label>

                                <div className="liquid-input-wrapper">
                                    <Lock size={18} />

                                    <input
                                        id="password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="password"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        placeholder="Nhập mật khẩu"
                                        autoComplete="current-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="liquid-password-toggle"
                                        onClick={() =>
                                            setShowPassword(
                                                (previous) => !previous
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

                            {/* ERROR */}
                            {error && (
                                <div className="liquid-error">
                                    {error}
                                </div>
                            )}

                            {/* LOGIN BUTTON */}
                            <button
                                type="submit"
                                className="liquid-submit"
                                disabled={loading}
                            >
                                <span>
                                    {loading
                                        ? "Đang đăng nhập..."
                                        : "Đăng nhập"}
                                </span>

                                {!loading && (
                                    <ArrowRight size={18} />
                                )}
                            </button>
                        </form>

                        {/* REGISTER */}
                        <div className="liquid-register">
                            <span>
                                Chưa có tài khoản?
                            </span>

                            <Link to="/register">
                                Đăng ký ngay
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="liquid-copyright">
                    © 2026 FIXHUB
                </div>
            </div>
        </div>
    );
}

export default Login;