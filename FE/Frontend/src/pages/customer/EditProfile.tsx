import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
    Mail,
    MapPin,
    Phone,
    Save,
    User,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
    getCustomersApi,
    updateCustomerApi,
} from "../../api/customerApi";

import type { Customer } from "../../types/customer";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^0\d{9}$/;

function EditProfile() {
    const { user, updateUser } = useAuth();

    const [customer, setCustomer] =
        useState<Customer | null>(null);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) {
                setError(
                    "Không tìm thấy thông tin tài khoản."
                );
                setLoading(false);
                return;
            }

            try {
                setError("");

                const customers = await getCustomersApi();

                const currentCustomer = customers.find(
                    (item) =>
                        item.user.email === user.email
                );

                if (!currentCustomer) {
                    setError(
                        "Không tìm thấy thông tin khách hàng tương ứng với tài khoản."
                    );
                    return;
                }

                setCustomer(currentCustomer);

                setFullName(currentCustomer.fullName);
                setEmail(currentCustomer.user.email);
                setPhone(currentCustomer.phone);
                setAddress(currentCustomer.address);
            } catch (error: any) {
                console.error(error);

                setError(
                    error.response?.data?.message ||
                    "Không thể tải thông tin cá nhân."
                );
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user]);

    const handleChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = event.target;

        if (name === "fullName") {
            setFullName(value);
        }

        if (name === "email") {
            setEmail(value);
        }

        if (name === "phone") {
            setPhone(value);
        }

        if (name === "address") {
            setAddress(value);
        }

        setSuccess("");
        setError("");
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!customer) {
            return;
        }

        setError("");
        setSuccess("");

        const fullNameValue = fullName.trim();
        const emailValue = email.trim();
        const phoneValue = phone.trim();
        const addressValue = address.trim();

        if (!fullNameValue) {
            setError("Vui lòng nhập họ và tên.");
            return;
        }

        if (!emailValue) {
            setError("Vui lòng nhập email.");
            return;
        }

        if (!emailRegex.test(emailValue)) {
            setError(
                "Email không đúng định dạng."
            );
            return;
        }

        if (!phoneValue) {
            setError(
                "Vui lòng nhập số điện thoại."
            );
            return;
        }

        if (!phoneRegex.test(phoneValue)) {
            setError(
                "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0."
            );
            return;
        }

        if (!addressValue) {
            setError("Vui lòng nhập địa chỉ.");
            return;
        }

        setSaving(true);

        try {
            const updatedCustomer =
                await updateCustomerApi(
                    customer.id,
                    {
                        customerCode:
                            customer.customerCode,
                        fullName: fullNameValue,
                        email: emailValue,
                        phone: phoneValue,
                        address: addressValue,
                    }
                );

            setCustomer(updatedCustomer);

            setFullName(
                updatedCustomer.fullName
            );

            setEmail(
                updatedCustomer.user.email
            );

            setPhone(
                updatedCustomer.phone
            );

            setAddress(
                updatedCustomer.address
            );

            /*
             * Cập nhật email trong AuthContext
             * và localStorage để hệ thống sử dụng
             * email mới sau khi người dùng chỉnh sửa.
             */
            updateUser({
                email: updatedCustomer.user.email,
            });

            setSuccess(
                "Cập nhật thông tin thành công."
            );
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                "Cập nhật thông tin thất bại."
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="page-header">
                    <h1>Thông tin cá nhân</h1>
                    <p>
                        Đang tải thông tin...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="page-header">
                <h1>Thông tin cá nhân</h1>

                <p>
                    Xem và cập nhật thông tin tài khoản
                    của bạn.
                </p>
            </div>

            <div className="profile-card">
                {customer && (
                    <>
                        <div className="profile-card-header">
                            <div>
                                <h2>
                                    Thông tin khách hàng
                                </h2>

                                <p>
                                    Bạn có thể chỉnh sửa
                                    thông tin cá nhân.
                                </p>
                            </div>

                            <div className="profile-code">
                                Mã khách hàng:{" "}
                                <strong>
                                    {
                                        customer.customerCode
                                    }
                                </strong>
                            </div>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="success-message">
                                {success}
                            </div>
                        )}

                        <form
                            className="profile-form"
                            onSubmit={handleSubmit}
                        >
                            <div className="profile-form-grid">
                                {/* HỌ VÀ TÊN */}
                                <div className="form-group">
                                    <label htmlFor="fullName">
                                        Họ và tên
                                    </label>

                                    <div className="profile-input-wrapper">
                                        <User size={18} />

                                        <input
                                            id="fullName"
                                            type="text"
                                            name="fullName"
                                            value={fullName}
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Nhập họ và tên"
                                        />
                                    </div>
                                </div>

                                {/* EMAIL */}
                                <div className="form-group">
                                    <label htmlFor="email">
                                        Email
                                    </label>

                                    <div className="profile-input-wrapper">
                                        <Mail size={18} />

                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Nhập email"
                                        />
                                    </div>
                                </div>

                                {/* SỐ ĐIỆN THOẠI */}
                                <div className="form-group">
                                    <label htmlFor="phone">
                                        Số điện thoại
                                    </label>

                                    <div className="profile-input-wrapper">
                                        <Phone size={18} />

                                        <input
                                            id="phone"
                                            type="tel"
                                            name="phone"
                                            value={phone}
                                            onChange={
                                                handleChange
                                            }
                                            maxLength={10}
                                            placeholder="0912345678"
                                        />
                                    </div>
                                </div>

                                {/* ĐỊA CHỈ */}
                                <div className="form-group">
                                    <label htmlFor="address">
                                        Địa chỉ
                                    </label>

                                    <div className="profile-input-wrapper">
                                        <MapPin size={18} />

                                        <input
                                            id="address"
                                            type="text"
                                            name="address"
                                            value={address}
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Nhập địa chỉ"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="profile-actions">
                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    <Save size={16} />

                                    {saving
                                        ? "Đang lưu..."
                                        : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default EditProfile;