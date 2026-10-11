import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
    changeCustomerStatusApi,
    createCustomerApi,
    getCustomersApi,
    updateCustomerApi,
} from "../../api/customerApi";

import type {
    Customer,
    CustomerRequest,
} from "../../types/customer";

function AdminCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);

    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] =
        useState<Customer | null>(null);

    const [form, setForm] = useState<CustomerRequest>({
        customerCode: "",
        fullName: "",
        email: "",
        password: "",
        phone: "",
        address: "",
    });

    // =========================
    // LOAD CUSTOMERS
    // =========================

    const loadCustomers = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getCustomersApi({
                keyword: keyword.trim() || undefined,
                status: statusFilter || undefined,
            });

            setCustomers(data);
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể tải danh sách khách hàng."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    // =========================
    // FORM
    // =========================

    const resetForm = () => {
        setForm({
            customerCode: "",
            fullName: "",
            email: "",
            password: "",
            phone: "",
            address: "",
        });

        setEditingCustomer(null);
    };

    const openCreateModal = () => {
        resetForm();

        setError("");
        setSuccess("");

        setShowModal(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);

        setForm({
            customerCode: customer.customerCode,
            fullName: customer.fullName,
            email: customer.email,
            password: "",
            phone: customer.phone,
            address: customer.address,
        });

        setError("");
        setSuccess("");

        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) {
            return;
        }

        setShowModal(false);
        resetForm();
    };

    // =========================
    // CREATE / UPDATE
    // =========================

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!form.customerCode.trim()) {
            setError("Mã khách hàng không được để trống.");
            return;
        }

        if (!form.fullName.trim()) {
            setError("Họ tên không được để trống.");
            return;
        }

        if (!form.email.trim()) {
            setError("Email không được để trống.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError("Email không hợp lệ.");
            return;
        }

        if (!/^0\d{9}$/.test(form.phone)) {
            setError(
                "Số điện thoại phải gồm 10 số và bắt đầu bằng 0."
            );
            return;
        }

        if (!form.address.trim()) {
            setError("Địa chỉ không được để trống.");
            return;
        }

        if (!editingCustomer && !form.password?.trim()) {
            setError("Mật khẩu không được để trống khi tạo khách hàng.");
            return;
        }

        if (
            !editingCustomer &&
            form.password &&
            form.password.length < 6
        ) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        try {
            setSaving(true);

            const data: CustomerRequest = {
                customerCode: form.customerCode.trim(),
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
            };

            if (form.password?.trim()) {
                data.password = form.password.trim();
            }

            if (editingCustomer) {
                await updateCustomerApi(
                    editingCustomer.id,
                    data
                );

                setSuccess(
                    "Cập nhật khách hàng thành công."
                );
            } else {
                await createCustomerApi(data);

                setSuccess(
                    "Thêm khách hàng thành công."
                );
            }

            setShowModal(false);
            resetForm();

            await loadCustomers();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể lưu thông tin khách hàng."
            );
        } finally {
            setSaving(false);
        }
    };

    // =========================
    // CHANGE STATUS
    // =========================

    const handleChangeStatus = async (
        customer: Customer
    ) => {
        const action =
            customer.status === "ACTIVE"
                ? "khóa"
                : "mở khóa";

        const confirmed = window.confirm(
            `Bạn có chắc muốn ${action} khách hàng "${customer.fullName}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await changeCustomerStatusApi(
                customer.id
            );

            setSuccess(
                "Thay đổi trạng thái khách hàng thành công."
            );

            await loadCustomers();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể thay đổi trạng thái khách hàng."
            );
        }
    };

    return (
        <div className="management-page">
            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <div className="management-header page-header">
                <div>
                    <h1>Quản lý khách hàng</h1>

                    <p>
                        Quản lý thông tin và trạng thái tài khoản khách hàng.
                    </p>
                </div>

                <button
                    className="primary-button"
                    onClick={openCreateModal}
                >
                    + Thêm khách hàng
                </button>
            </div>

            {/* ========================= */}
            {/* MESSAGE */}
            {/* ========================= */}

            {success && (
                <div className="success-message">
                    {success}
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* ========================= */}
            {/* FILTER */}
            {/* ========================= */}

            <div className="filter-panel">
                <div className="filter-field">
                    <label>
                        Tìm kiếm
                    </label>

                    <input
                        type="text"
                        value={keyword}
                        onChange={(event) =>
                            setKeyword(
                                event.target.value
                            )
                        }
                        placeholder="Tên, mã, email, số điện thoại..."
                    />
                </div>

                <div className="filter-field">
                    <label>
                        Trạng thái
                    </label>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Tất cả
                        </option>

                        <option value="ACTIVE">
                            Đang hoạt động
                        </option>

                        <option value="LOCKED">
                            Đã khóa
                        </option>
                    </select>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-end",
                    }}
                >
                    <button
                        className="secondary-button"
                        onClick={loadCustomers}
                    >
                        Tìm kiếm
                    </button>
                </div>
            </div>

            {/* ========================= */}
            {/* TABLE */}
            {/* ========================= */}

            <div className="table-container">
                {loading ? (
                    <div className="table-state">
                        Đang tải danh sách khách hàng...
                    </div>
                ) : customers.length === 0 ? (
                    <div className="table-state">
                        Không có khách hàng nào.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mã KH</th>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>Số điện thoại</th>
                                <th>Địa chỉ</th>
                                <th>Số lần sửa</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {customers.map(
                                (customer) => (
                                    <tr
                                        key={
                                            customer.id
                                        }
                                    >
                                        <td>
                                            {
                                                customer.id
                                            }
                                        </td>

                                        <td>
                                            {
                                                customer.customerCode
                                            }
                                        </td>

                                        <td>
                                            {
                                                customer.fullName
                                            }
                                        </td>

                                        <td>
                                            {
                                                customer.email
                                            }
                                        </td>

                                        <td>
                                            {
                                                customer.phone
                                            }
                                        </td>

                                        <td>
                                            {
                                                customer.address
                                            }
                                        </td>

                                        <td>
                                            {
                                                customer.repairCount
                                            }
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    customer.status ===
                                                    "ACTIVE"
                                                        ? "status active"
                                                        : "status inactive"
                                                }
                                            >
                                                {customer.status ===
                                                "ACTIVE"
                                                    ? "Đang hoạt động"
                                                    : "Đã khóa"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        openEditModal(
                                                            customer
                                                        )
                                                    }
                                                >
                                                    Sửa
                                                </button>

                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        handleChangeStatus(
                                                            customer
                                                        )
                                                    }
                                                >
                                                    {customer.status ===
                                                    "ACTIVE"
                                                        ? "Khóa"
                                                        : "Mở khóa"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ========================= */}
            {/* MODAL */}
            {/* ========================= */}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal customer-modal">
                        <div className="modal-header">
                            <h2>
                                {editingCustomer
                                    ? "Sửa khách hàng"
                                    : "Thêm khách hàng"}
                            </h2>

                            <button
                                className="modal-close"
                                type="button"
                                onClick={closeModal}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                        >
                            {/* MÃ KHÁCH HÀNG */}

                            <div className="form-group">
                                <label>
                                    Mã khách hàng
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.customerCode
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            customerCode:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    disabled={
                                        editingCustomer !==
                                        null
                                    }
                                    placeholder="VD: KH000001"
                                    required
                                />

                                {editingCustomer && (
                                    <small
                                        style={{
                                            color: "#666",
                                        }}
                                    >
                                        Mã khách hàng không
                                        được thay đổi sau khi
                                        tạo.
                                    </small>
                                )}
                            </div>

                            {/* HỌ TÊN */}

                            <div
                                className="form-group"
                                style={{
                                    marginTop: "16px",
                                }}
                            >
                                <label>
                                    Họ và tên
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.fullName
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            fullName:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </div>

                            {/* EMAIL */}

                            <div
                                className="form-group"
                                style={{
                                    marginTop: "16px",
                                }}
                            >
                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={
                                        form.email
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            email:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="customer@gmail.com"
                                    required
                                />
                            </div>

                            {/* PASSWORD */}

                            <div
                                className="form-group"
                                style={{
                                    marginTop: "16px",
                                }}
                            >
                                <label>
                                    Mật khẩu{" "}
                                    {editingCustomer
                                        ? "(để trống nếu không đổi)"
                                        : ""}
                                </label>

                                <input
                                    type="password"
                                    value={
                                        form.password
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            password:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder={
                                        editingCustomer
                                            ? "Mật khẩu mới"
                                            : "Tối thiểu 6 ký tự"
                                    }
                                    required={
                                        !editingCustomer
                                    }
                                />
                            </div>

                            {/* PHONE */}

                            <div
                                className="form-group"
                                style={{
                                    marginTop: "16px",
                                }}
                            >
                                <label>
                                    Số điện thoại
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.phone
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            phone:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="0912345678"
                                    maxLength={10}
                                    required
                                />
                            </div>

                            {/* ADDRESS */}

                            <div
                                className="form-group"
                                style={{
                                    marginTop: "16px",
                                }}
                            >
                                <label>
                                    Địa chỉ
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.address
                                    }
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            address:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="Hà Nội"
                                    required
                                />
                            </div>

                            {/* BUTTON */}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Hủy
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Đang lưu..."
                                        : editingCustomer
                                        ? "Cập nhật"
                                        : "Thêm khách hàng"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminCustomers;