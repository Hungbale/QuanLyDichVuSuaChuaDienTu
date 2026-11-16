import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
    changeCustomerStatusApi,
    createCustomerApi,
    getCustomerByIdApi,
    getCustomersApi,
    updateCustomerApi,
} from "../../api/customerApi";

import type {
    Customer,
    CustomerRequest,
} from "../../types/customer";
import { getRepairTicketsApi } from "../../api/repairTicketApi";
import type { RepairTicket } from "../../types/repairTicket";

const apiMessage = (error: unknown, fallback: string) => {
    if (!error || typeof error !== "object") return fallback;
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    return typeof response?.data?.message === "string" ? response.data.message : fallback;
};

const customerStatusLabel = (status: string | null | undefined) => {
    switch (status?.trim().toUpperCase()) {
        case "ACTIVE":
            return "\u0110ang ho\u1ea1t \u0111\u1ed9ng";
        case "LOCKED":
            return "\u0110\u00e3 kh\u00f3a";
        default:
            return "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh";
    }
};

const repairStatusLabel = (status: string | null | undefined) => {
    const normalized = status?.trim().toUpperCase().replace(/[ -]+/g, "_");
    const labels: Record<string, string> = {
        SCHEDULED: "Ch\u1edd ti\u1ebfp nh\u1eadn",
        RECEIVED: "\u0110\u00e3 ti\u1ebfp nh\u1eadn",
        DIAGNOSING: "\u0110ang ch\u1ea9n \u0111o\u00e1n",
        WAITING_FOR_QUOTE_APPROVAL: "Ch\u1edd x\u00e1c nh\u1eadn b\u00e1o gi\u00e1",
        REPAIRING: "\u0110ang s\u1eeda ch\u1eefa",
        IN_PROGRESS: "\u0110ang s\u1eeda ch\u1eefa",
        WAITING_FOR_PARTS: "Ch\u1edd linh ki\u1ec7n",
        CANNOT_BE_REPAIRED: "Kh\u00f4ng th\u1ec3 s\u1eeda",
        CUSTOMER_DECLINED: "Kh\u00e1ch h\u00e0ng t\u1eeb ch\u1ed1i",
        COMPLETED: "Ho\u00e0n th\u00e0nh",
        CANCELLED: "\u0110\u00e3 h\u1ee7y",
    };
    return normalized ? labels[normalized] ?? "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh" : "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh";
};

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
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [customerTickets, setCustomerTickets] = useState<RepairTicket[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");

    const viewCustomer = async (customer: Customer) => {
        setDetailLoading(true);
        setError("");
        setCustomerTickets([]);
        setHistoryError("");
        try {
            const detail = await getCustomerByIdApi(customer.id);
            setViewingCustomer(detail);
            setHistoryLoading(true);
            try {
                const tickets = await getRepairTicketsApi(detail.customerCode);
                setCustomerTickets(tickets.filter((ticket) => ticket.customerId === detail.id));
            } catch (historyRequestError: unknown) {
                setHistoryError(apiMessage(historyRequestError, "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c l\u1ecbch s\u1eed s\u1eeda ch\u1eefa."));
            } finally {
                setHistoryLoading(false);
            }
        } catch (requestError: unknown) {
            setError(apiMessage(requestError, "Kh\u00f4ng th\u1ec3 t\u1ea3i chi ti\u1ebft kh\u00e1ch h\u00e0ng."));
        } finally {
            setDetailLoading(false);
        }
    };

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

            const data = await getCustomersApi({ status: statusFilter || undefined });

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

    const visibleCustomers = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi-VN");
        return customers.filter((customer) => !normalizedKeyword || [
            customer.customerCode, customer.fullName, customer.email,
            customer.user?.email, customer.phone,
        ].some((value) => value?.toLocaleLowerCase("vi-VN").includes(normalizedKeyword)));
    }, [customers, keyword]);

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

        const usedCodes = new Set(customers.map((customer) => customer.customerCode));
        const highestNumber = customers.reduce((highest, customer) => {
            const match = customer.customerCode.match(/^(?:KH)?(\d+)$/i);
            return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0);
        let nextNumber = highestNumber + 1;
        let customerCode = `KH${String(nextNumber).padStart(6, "0")}`;
        while (usedCodes.has(customerCode)) {
            nextNumber += 1;
            customerCode = `KH${String(nextNumber).padStart(6, "0")}`;
        }
        setForm((current) => ({ ...current, customerCode }));

        setError("");
        setSuccess("");

        setShowModal(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);

        setForm({
            customerCode: customer.customerCode,
            fullName: customer.fullName,
            email: customer.email ?? customer.user?.email ?? "",
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
            setError("Địa chỉ thư điện tử không được để trống.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError("Địa chỉ thư điện tử không hợp lệ.");
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

            await changeCustomerStatusApi(customer.id, customer.status === "ACTIVE" ? "LOCKED" : "ACTIVE");

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
        <div className="management-page admin-people-page admin-customers-page">
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

            <div className="filter-panel admin-people-filters">
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

            <section className="admin-people-list-section">
                <div className="admin-people-section-heading">
                    <div>
                        <h2>Danh sách khách hàng</h2>
                        <p>Theo dõi hồ sơ, trạng thái và thao tác quản lý.</p>
                    </div>
                    <span>{customers.length} khách hàng</span>
                </div>
                <div className="table-container">
                {loading ? (
                    <div className="table-state">
                        Đang tải danh sách khách hàng...
                    </div>
                ) : visibleCustomers.length === 0 ? (
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
                                <th>Địa chỉ thư điện tử</th>
                                <th>Số điện thoại</th>
                                <th>Địa chỉ</th>
                                <th>Số lần sửa</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {visibleCustomers.map(
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
                                            {customer.email ?? customer.user?.email ?? "—"}
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
                                                <button className="secondary-button" type="button" onClick={() => void viewCustomer(customer)}>Chi tiết</button>
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
            </section>

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
                                    readOnly={!editingCustomer}
                                    placeholder="VD: KH000001"
                                    required
                                />

                                {!editingCustomer && (
                                    <small style={{ color: "#777283" }}>
                                        Mã khách hàng được tự tạo khi mở biểu mẫu.
                                    </small>
                                )}

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
                                    Địa chỉ thư điện tử
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
            {detailLoading && <div className="modal-overlay"><div className="modal customer-modal">Đang tải hồ sơ khách hàng...</div></div>}
            {viewingCustomer && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingCustomer(null); }}>
                <section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="customer-detail-title">
                    <div className="modal-header"><div><h2 id="customer-detail-title">H&#7891; s&#417; kh&#225;ch h&#224;ng</h2><p>{viewingCustomer.customerCode}</p></div><button className="modal-close" type="button" aria-label="&#272;&#243;ng" onClick={() => setViewingCustomer(null)}>&#215;</button></div>
                    <div className="appointment-details-grid">
                        <div><span>H&#7885; t&#234;n</span><strong>{viewingCustomer.fullName}</strong></div>
                        <div><span>Email</span><strong>{viewingCustomer.email || viewingCustomer.user?.email || "&#8212;"}</strong></div>
                        <div><span>S&#7889; &#273;i&#7879;n tho&#7841;i</span><strong>{viewingCustomer.phone}</strong></div>
                                <div><span>Tr&#7841;ng th&#225;i</span><strong>{customerStatusLabel(viewingCustomer.status)}</strong></div>
                        <div><span>S&#7889; l&#7847;n s&#7917;a ch&#7919;a</span><strong>{viewingCustomer.repairCount}</strong></div>
                        <div className="appointment-detail-full"><span>&#272;&#7883;a ch&#7881;</span><strong>{viewingCustomer.address || "&#8212;"}</strong></div>
                    </div>
                    <section className="customer-repair-history">
                        <h3>L&#7883;ch s&#7917; s&#7917;a ch&#7919;a</h3>
                        {historyLoading ? <div className="table-state">&#272;ang t&#7843;i l&#7883;ch s&#7917; s&#7917;a ch&#7919;a...</div>
                            : historyError ? <div className="error-message" role="alert">{historyError}</div>
                            : customerTickets.length === 0 ? <div className="table-state">Kh&#225;ch h&#224;ng ch&#432;a c&#243; phi&#7871;u s&#7917;a ch&#7919;a.</div>
                            : <div className="appointment-table-container"><table className="appointment-table"><thead><tr><th>M&#227; phi&#7871;u</th><th>Thi&#7871;t b&#7883;</th><th>Ng&#224;y ti&#7871;p nh&#7853;n</th><th>Tr&#7841;ng th&#225;i</th></tr></thead><tbody>
                                {customerTickets.slice().sort((a, b) => b.receivedDate.localeCompare(a.receivedDate)).map((ticket) => <tr key={ticket.id}><td>{ticket.ticketCode}</td><td>{ticket.device}</td><td>{ticket.receivedDate}</td><td>{repairStatusLabel(ticket.status)}</td></tr>)}
                            </tbody></table></div>}
                    </section>
                    <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setViewingCustomer(null)}>&#272;&#243;ng</button></div>
                </section>
            </div>}
        </div>
    );
}

export default AdminCustomers;
