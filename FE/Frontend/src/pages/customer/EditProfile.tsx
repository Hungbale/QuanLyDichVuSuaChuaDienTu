import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
    Mail,
    MapPin,
    Pencil,
    Phone,
    Save,
    User,
    X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
    getMyCustomerProfileApi,
    updateMyCustomerProfileApi,
} from "../../api/customerApi";

import type { Customer } from "../../types/customer";

const phoneRegex = /^0\d{9}$/;

function EditProfile() {
    const { user } = useAuth();

    const [customer, setCustomer] =
        useState<Customer | null>(null);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) {
                setNotice({ type: "error", message: "Không tìm thấy thông tin tài khoản." });
                setLoading(false);
                return;
            }

            try {
                const currentCustomer = await getMyCustomerProfileApi();

                setCustomer(currentCustomer);

                setFullName(currentCustomer.fullName);
                setEmail(user.email);
                setPhone(currentCustomer.phone);
                setAddress(currentCustomer.address);
            } catch (error: any) {
                console.error(error);
                setCustomer(null);

                setNotice({ type: "error", message: error.response?.data?.message ||
                    "Không thể tải thông tin cá nhân." });
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user?.id]);

    const handleChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = event.target;

        if (name === "fullName") {
            setFullName(value);
        }

        if (name === "email") setEmail(value);

        if (name === "phone") {
            setPhone(value);
        }

        if (name === "address") {
            setAddress(value);
        }

        setNotice(null);
    };

    const handleCancelEdit = () => {
        if (!customer) return;
        setFullName(customer.fullName);
        setEmail(user?.email ?? customer.email ?? "");
        setPhone(customer.phone);
        setAddress(customer.address);
        setIsEditing(false);
        setNotice(null);
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!customer) {
            return;
        }
        if (!isEditing) return;
        setNotice(null);

        const fullNameValue = fullName.trim();
        const phoneValue = phone.trim();
        const addressValue = address.trim();

        if (!fullNameValue) {
            setNotice({ type: "error", message: "Vui lòng nhập họ và tên." });
            return;
        }

        const currentEmail = user?.email ?? "";

        if (!phoneValue) {
            setNotice({ type: "error", message: "Vui lòng nhập số điện thoại." });
            return;
        }

        if (!phoneRegex.test(phoneValue)) {
            setNotice({ type: "error", message: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0." });
            return;
        }

        if (!addressValue) {
            setNotice({ type: "error", message: "Vui lòng nhập địa chỉ." });
            return;
        }

        setSaving(true);
        setNotice(null);

        try {
            const updatedCustomer = await updateMyCustomerProfileApi({
                        customerCode:
                            customer.customerCode,
                        fullName: fullNameValue,
                        email: currentEmail,
                        phone: phoneValue,
                        address: addressValue,
                    });

            setCustomer(updatedCustomer);

            setFullName(
                updatedCustomer.fullName
            );

            setEmail(currentEmail);

            setPhone(
                updatedCustomer.phone
            );

            setAddress(
                updatedCustomer.address
            );
            const message = "Cập nhật thông tin thành công.";
            setNotice({ type: "success", message });
            setIsEditing(false);
        } catch (error: any) {
            console.error(error);

            const message = error.response?.data?.message || "Cập nhật thông tin thất bại.";
            setNotice({ type: "error", message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="management-page appointment-page profile-page">
                <header className="appointment-page-header">
                    <span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span>
                    <h1>Thông tin cá nhân</h1>
                    <p>
                        Đang tải thông tin...
                    </p>
                </header>
            </div>
        );
    }

    return (
        <div className="management-page appointment-page profile-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span>
                <h1>Thông tin cá nhân</h1>

                <p>
                    Xem và cập nhật thông tin tài khoản
                    của bạn.
                </p>
            </header>

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

                        {notice && (
                            <div className={notice.type === "success" ? "success-message" : "error-message"}>
                                {notice.message}
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
                                            disabled={!isEditing || saving}
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
                                            readOnly
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
                                            disabled={!isEditing || saving}
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
                                            disabled={!isEditing || saving}
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Nhập địa chỉ"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="profile-actions">
                                {isEditing ? (
                                    <>
                                        <button type="button" className="secondary-button" onClick={handleCancelEdit} disabled={saving}>
                                            <X size={16} /> Hủy
                                        </button>
                                        <button type="submit" className="primary-button" disabled={saving}>
                                            <Save size={16} />
                                            {saving ? "Đang cập nhật..." : "Cập nhật"}
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" className="primary-button" onClick={() => {
                                        if (customer) {
                                            setFullName(customer.fullName);
                                            setEmail(user?.email ?? customer.email ?? "");
                                            setPhone(customer.phone);
                                            setAddress(customer.address);
                                        }
                                        setNotice(null);
                                        setIsEditing(true);
                                    }}>
                                        <Pencil size={16} /> Chỉnh sửa thông tin
                                    </button>
                                )}
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default EditProfile;
