import { useEffect, useState } from "react";

import {
    changeEmployeeStatusApi,
    createEmployeeApi,
    deleteEmployeeApi,
    getEmployeeByIdApi,
    getEmployeesApi,
    updateEmployeeApi,
} from "../../api/employeeApi";

import type {
    Employee,
    EmployeeRequest,
} from "../../types/employee";

function AdminEmployees() {
    const [employees, setEmployees] = useState<Employee[]>([]);

    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] =
        useState<Employee | null>(null);
    const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const viewEmployee = async (employee: Employee) => {
        setDetailLoading(true);
        setError("");
        try { setViewingEmployee(await getEmployeeByIdApi(employee.id)); }
        catch (error: any) { setError(error.response?.data?.message || "Không thể tải chi tiết nhân viên."); }
        finally { setDetailLoading(false); }
    };

    const [form, setForm] = useState<EmployeeRequest>({
        employeeCode: "",
        fullName: "",
        phone: "",
        email: "",
        password: "",
    });

    // =========================
    // LOAD EMPLOYEES
    // =========================

    const loadEmployees = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getEmployeesApi({
                keyword: keyword.trim() || undefined,
                status: statusFilter || undefined,
            });

            setEmployees(data);
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể tải danh sách nhân viên."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, []);

    // =========================
    // FORM
    // =========================

    const resetForm = () => {
        setForm({
            employeeCode: "",
            fullName: "",
            phone: "",
            email: "",
            password: "",
        });

        setEditingEmployee(null);
    };

    const openCreateModal = () => {
        resetForm();

        const usedCodes = new Set(employees.map((employee) => employee.employeeCode));
        const highestNumber = employees.reduce((highest, employee) => {
            const match = employee.employeeCode.match(/^(?:NV)?(\d+)$/i);
            return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0);
        let nextNumber = highestNumber + 1;
        let employeeCode = `NV${String(nextNumber).padStart(3, "0")}`;
        while (usedCodes.has(employeeCode)) {
            nextNumber += 1;
            employeeCode = `NV${String(nextNumber).padStart(3, "0")}`;
        }
        setForm((current) => ({ ...current, employeeCode }));

        setError("");
        setSuccess("");

        setShowModal(true);
    };

    const openEditModal = (employee: Employee) => {
        setEditingEmployee(employee);

        setForm({
            employeeCode: employee.employeeCode,
            fullName: employee.fullName,
            phone: employee.phone,
            email: employee.email ?? employee.user?.email ?? "",
            password: "",
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

    const handleChange = (
        field: keyof EmployeeRequest,
        value: string
    ) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    // =========================
    // CREATE / UPDATE
    // =========================

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!form.employeeCode.trim()) {
            setError("Mã nhân viên không được để trống.");
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

        if (!/^0\d{9}$/.test(form.phone)) {
            setError(
                "Số điện thoại phải gồm 10 số và bắt đầu bằng 0."
            );
            return;
        }

        if (!editingEmployee && !form.password?.trim()) {
            setError("Mật khẩu không được để trống.");
            return;
        }

        try {
            setSaving(true);

            if (editingEmployee) {
                const data: EmployeeRequest = {
                    employeeCode: form.employeeCode.trim(),
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    email: form.email.trim(),
                    ...(form.password?.trim()
                        ? { password: form.password.trim() }
                        : {}),
                };

                await updateEmployeeApi(
                    editingEmployee.id,
                    data
                );

                setSuccess("Cập nhật nhân viên thành công.");
            } else {
                const data: EmployeeRequest = {
                    employeeCode: form.employeeCode.trim(),
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    email: form.email.trim(),
                    password: form.password?.trim(),
                };

                await createEmployeeApi(data);

                setSuccess("Thêm nhân viên thành công.");
            }

            setShowModal(false);
            resetForm();

            await loadEmployees();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể lưu thông tin nhân viên."
            );
        } finally {
            setSaving(false);
        }
    };

    // =========================
    // STATUS
    // =========================

    const handleChangeStatus = async (
        employee: Employee
    ) => {
        const action =
            employee.status === "ACTIVE"
                ? "khóa"
                : "mở khóa";

        const confirmed = window.confirm(
            `Bạn có chắc muốn ${action} nhân viên "${employee.fullName}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await changeEmployeeStatusApi(employee.id);

            setSuccess(
                `${
                    action === "khóa"
                        ? "Khóa"
                        : "Mở khóa"
                } nhân viên thành công.`
            );

            await loadEmployees();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể thay đổi trạng thái nhân viên."
            );
        }
    };

    // =========================
    // DELETE
    // =========================

    const handleDelete = async (
        employee: Employee
    ) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa nhân viên "${employee.fullName}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await deleteEmployeeApi(employee.id);

            setSuccess("Xóa nhân viên thành công.");

            await loadEmployees();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể xóa nhân viên."
            );
        }
    };

    // =========================
    // SEARCH
    // =========================

    const handleSearch = async () => {
        await loadEmployees();
    };

    const handleSearchKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="management-page admin-people-page admin-employees-page">
            {/* HEADER */}

            <div className="management-header page-header">
                <div>
                    <h1>Quản lý nhân viên</h1>

                    <p>
                        Thêm, sửa, xóa và quản lý thông tin nhân viên.
                    </p>
                </div>

                <button
                    className="primary-button"
                    onClick={openCreateModal}
                >
                    + Thêm nhân viên
                </button>
            </div>

            {/* MESSAGE */}

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

            {/* FILTER */}

            <div className="filter-panel admin-people-filters">
                <div className="filter-field">
                    <label htmlFor="employee-keyword">
                        Tìm kiếm
                    </label>

                    <input
                        id="employee-keyword"
                        type="text"
                        value={keyword}
                        onChange={(event) =>
                            setKeyword(event.target.value)
                        }
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Mã, tên, email, số điện thoại..."
                    />
                </div>

                <div className="filter-field">
                    <label htmlFor="employee-status">Trạng thái</label>
                    <select
                        id="employee-status"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="">Tất cả</option>
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="LOCKED">Đã khóa</option>
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
                        onClick={handleSearch}
                        disabled={loading}
                    >
                        Tìm kiếm
                    </button>
                </div>
            </div>

            {/* TABLE */}

            <section className="admin-people-list-section">
                <div className="admin-people-section-heading">
                    <div>
                        <h2>Danh sách nhân viên</h2>
                        <p>Theo dõi hồ sơ, trạng thái và thao tác quản lý.</p>
                    </div>
                    <span>{employees.length} nhân viên</span>
                </div>
                <div className="table-container">
                {loading ? (
                    <div className="table-state">
                        Đang tải danh sách nhân viên...
                    </div>
                ) : employees.length === 0 ? (
                    <div className="table-state">
                        Không có nhân viên nào.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mã nhân viên</th>
                                <th>Họ tên</th>
                                <th>Địa chỉ thư điện tử</th>
                                <th>Số điện thoại</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {employees.map((employee) => (
                                <tr key={employee.id}>
                                    <td>
                                        {employee.id}
                                    </td>

                                    <td>
                                        {employee.employeeCode}
                                    </td>

                                    <td>
                                        {employee.fullName}
                                    </td>

                                    <td>
                                        {employee.email ?? employee.user?.email ?? "—"}
                                    </td>

                                    <td>
                                        {employee.phone}
                                    </td>

                                    <td>
                                        <span
                                            className={
                                                employee.status ===
                                                "ACTIVE"
                                                    ? "status active"
                                                    : "status inactive"
                                            }
                                        >
                                            {employee.status ===
                                            "ACTIVE"
                                                ? "Đang hoạt động"
                                                : "Đã khóa"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="action-buttons">
                                            <button className="secondary-button" type="button" onClick={() => void viewEmployee(employee)}>Chi tiết</button>
                                            <button
                                                className="secondary-button"
                                                onClick={() =>
                                                    openEditModal(
                                                        employee
                                                    )
                                                }
                                            >
                                                Sửa
                                            </button>

                                            <button
                                                className="secondary-button"
                                                onClick={() =>
                                                    handleChangeStatus(
                                                        employee
                                                    )
                                                }
                                            >
                                                {employee.status ===
                                                "ACTIVE"
                                                    ? "Khóa"
                                                    : "Mở khóa"}
                                            </button>

                                            <button
                                                className="danger-button"
                                                onClick={() =>
                                                    handleDelete(
                                                        employee
                                                    )
                                                }
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            </section>

            {/* MODAL */}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal customer-modal">
                        <div className="modal-header">
                            <h2>
                                {editingEmployee
                                    ? "Sửa nhân viên"
                                    : "Thêm nhân viên"}
                            </h2>

                            <button
                                className="modal-close"
                                onClick={closeModal}
                                type="button"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>
                                    Mã nhân viên
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.employeeCode
                                    }
                                    onChange={(event) =>
                                        handleChange(
                                            "employeeCode",
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        !!editingEmployee
                                    }
                                    readOnly={!editingEmployee}
                                    placeholder="VD: NV001"
                                    required
                                />

                                {!editingEmployee && (
                                    <small style={{ color: "#777283" }}>
                                        Mã nhân viên được tự tạo khi mở biểu mẫu.
                                    </small>
                                )}

                                {editingEmployee && (
                                    <small
                                        style={{
                                            color: "#666",
                                        }}
                                    >
                                        Mã nhân viên không
                                        được thay đổi khi
                                        chỉnh sửa.
                                    </small>
                                )}
                            </div>

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
                                        handleChange(
                                            "fullName",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Nhập họ và tên"
                                    required
                                />
                            </div>

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
                                    value={form.email}
                                    onChange={(event) =>
                                        handleChange(
                                            "email",
                                            event.target.value
                                        )
                                    }
                                    placeholder="example@gmail.com"
                                    required
                                />
                            </div>

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
                                    value={form.phone}
                                    onChange={(event) =>
                                        handleChange(
                                            "phone",
                                            event.target.value
                                        )
                                    }
                                    placeholder="0912345678"
                                    maxLength={10}
                                    required
                                />
                            </div>

                            <div
                                className="form-group"
                                style={{
                                    marginTop: "16px",
                                }}
                            >
                                <label>
                                    {editingEmployee
                                        ? "Mật khẩu mới"
                                        : "Mật khẩu"}
                                </label>

                                <input
                                    type="password"
                                    value={
                                        form.password || ""
                                    }
                                    onChange={(event) =>
                                        handleChange(
                                            "password",
                                            event.target.value
                                        )
                                    }
                                    placeholder={
                                        editingEmployee
                                            ? "Để trống nếu không đổi"
                                            : "Nhập mật khẩu"
                                    }
                                    required={
                                        !editingEmployee
                                    }
                                />
                            </div>

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
                                        : editingEmployee
                                        ? "Cập nhật"
                                        : "Thêm nhân viên"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {detailLoading && <div className="modal-overlay"><div className="modal customer-modal">Đang tải hồ sơ nhân viên...</div></div>}
            {viewingEmployee && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingEmployee(null); }}><section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="employee-detail-title"><div className="modal-header"><div><h2 id="employee-detail-title">Hồ sơ nhân viên</h2><p>{viewingEmployee.employeeCode}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setViewingEmployee(null)}>×</button></div><div className="appointment-details-grid"><div><span>Họ tên</span><strong>{viewingEmployee.fullName}</strong></div><div><span>Địa chỉ thư điện tử</span><strong>{viewingEmployee.email || viewingEmployee.user?.email || "—"}</strong></div><div><span>Số điện thoại</span><strong>{viewingEmployee.phone}</strong></div><div><span>Trạng thái</span><strong>{viewingEmployee.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</strong></div></div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setViewingEmployee(null)}>Đóng</button></div></section></div>}
        </div>
    );
}

export default AdminEmployees;
