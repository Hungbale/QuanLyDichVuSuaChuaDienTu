import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
    changeCategoryStatusApi,
    createCategoryApi,
    deleteCategoryApi,
    getCategoriesApi,
    updateCategoryApi,
} from "../../api/categoryApi";

import {
    changeServiceStatusApi,
    createServiceApi,
    deleteServiceApi,
    getServicesApi,
    updateServiceApi,
} from "../../api/serviceApi";

import type { Category } from "../../types/category";
import type {
    ServiceItem,
    ServiceItemRequest,
} from "../../types/service";

function AdminServices() {
    // =========================
    // SERVICE STATE
    // =========================

    const [services, setServices] = useState<ServiceItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // =========================
    // SERVICE MODAL
    // =========================

    const [showServiceModal, setShowServiceModal] =
        useState(false);

    const [editingService, setEditingService] =
        useState<ServiceItem | null>(null);

    const [serviceForm, setServiceForm] =
        useState<ServiceItemRequest>({
            name: "",
            categoryId: 0,
            price: 0,
            description: "",
        });

    // =========================
    // CATEGORY MODAL
    // =========================

    const [showCategoryModal, setShowCategoryModal] =
        useState(false);

    const [editingCategory, setEditingCategory] =
        useState<Category | null>(null);

    const [categoryName, setCategoryName] = useState("");

    // =========================
    // LOAD DATA
    // =========================

    const loadCategories = async () => {
        try {
            const data = await getCategoriesApi();
            setCategories(data);
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể tải danh sách danh mục."
            );
        }
    };

    const loadServices = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getServicesApi({
                keyword: keyword.trim() || undefined,
                status: statusFilter || undefined,
                categoryId: categoryFilter
                    ? Number(categoryFilter)
                    : undefined,
            });

            setServices(data);
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể tải danh sách dịch vụ."
            );
        } finally {
            setLoading(false);
        }
    };

    const loadAll = async () => {
        await Promise.all([
            loadCategories(),
            loadServices(),
        ]);
    };

    useEffect(() => {
        loadAll();
    }, []);

    // =========================
    // SERVICE FORM
    // =========================

    const resetServiceForm = () => {
        setServiceForm({
            name: "",
            categoryId: 0,
            price: 0,
            description: "",
        });

        setEditingService(null);
    };

    const openCreateServiceModal = () => {
        resetServiceForm();

        setError("");
        setSuccess("");

        setShowServiceModal(true);
    };

    const openEditServiceModal = (
        service: ServiceItem
    ) => {
        setEditingService(service);

        setServiceForm({
            name: service.name,
            categoryId: service.category.id,
            price: service.price,
            description: service.description || "",
        });

        setError("");
        setSuccess("");

        setShowServiceModal(true);
    };

    const closeServiceModal = () => {
        if (saving) {
            return;
        }

        setShowServiceModal(false);
        resetServiceForm();
    };

    // =========================
    // SERVICE CRUD
    // =========================

    const handleServiceSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!serviceForm.name.trim()) {
            setError(
                "Tên dịch vụ không được để trống."
            );
            return;
        }

        if (!serviceForm.categoryId) {
            setError("Vui lòng chọn danh mục.");
            return;
        }

        if (serviceForm.price < 0) {
            setError("Giá dịch vụ không được âm.");
            return;
        }

        try {
            setSaving(true);

            const data: ServiceItemRequest = {
                name: serviceForm.name.trim(),
                categoryId: serviceForm.categoryId,
                price: Number(serviceForm.price),
                description:
                    serviceForm.description?.trim() || "",
            };

            if (editingService) {
                await updateServiceApi(
                    editingService.id,
                    data
                );

                setSuccess(
                    "Cập nhật dịch vụ thành công."
                );
            } else {
                await createServiceApi(data);

                setSuccess(
                    "Thêm dịch vụ thành công."
                );
            }

            setShowServiceModal(false);
            resetServiceForm();

            await loadServices();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể lưu dịch vụ."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleChangeServiceStatus = async (
        service: ServiceItem
    ) => {
        const action =
            service.status === "ACTIVE"
                ? "ngừng hoạt động"
                : "kích hoạt";

        const confirmed = window.confirm(
            `Bạn có chắc muốn ${action} dịch vụ "${service.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await changeServiceStatusApi(
                service.id
            );

            setSuccess(
                "Thay đổi trạng thái dịch vụ thành công."
            );

            await loadServices();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể thay đổi trạng thái dịch vụ."
            );
        }
    };

    const handleDeleteService = async (
        service: ServiceItem
    ) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa dịch vụ "${service.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await deleteServiceApi(service.id);

            setSuccess(
                "Xóa dịch vụ thành công."
            );

            await loadServices();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể xóa dịch vụ."
            );
        }
    };

    // =========================
    // CATEGORY FORM
    // =========================

    const resetCategoryForm = () => {
        setCategoryName("");
        setEditingCategory(null);
    };

    const openCreateCategoryModal = () => {
        resetCategoryForm();

        setError("");
        setSuccess("");

        setShowCategoryModal(true);
    };

    const openEditCategoryModal = (
        category: Category
    ) => {
        setEditingCategory(category);
        setCategoryName(category.name);

        setError("");
        setSuccess("");

        setShowCategoryModal(true);
    };

    const closeCategoryModal = () => {
        if (saving) {
            return;
        }

        setShowCategoryModal(false);
        resetCategoryForm();
    };

    // =========================
    // CATEGORY CRUD
    // =========================

    const handleCategorySubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!categoryName.trim()) {
            setError(
                "Tên danh mục không được để trống."
            );
            return;
        }

        try {
            setSaving(true);

            if (editingCategory) {
                await updateCategoryApi(
                    editingCategory.id,
                    {
                        name: categoryName.trim(),
                    }
                );

                setSuccess(
                    "Cập nhật danh mục thành công."
                );
            } else {
                await createCategoryApi({
                    name: categoryName.trim(),
                });

                setSuccess(
                    "Thêm danh mục thành công."
                );
            }

            setShowCategoryModal(false);
            resetCategoryForm();

            await loadCategories();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể lưu danh mục."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleChangeCategoryStatus = async (
        category: Category
    ) => {
        const action =
            category.status === "ACTIVE"
                ? "ngừng hoạt động"
                : "kích hoạt";

        const confirmed = window.confirm(
            `Bạn có chắc muốn ${action} danh mục "${category.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await changeCategoryStatusApi(
                category.id
            );

            setSuccess(
                "Thay đổi trạng thái danh mục thành công."
            );

            await loadCategories();
            await loadServices();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể thay đổi trạng thái danh mục."
            );
        }
    };

    const handleDeleteCategory = async (
        category: Category
    ) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa danh mục "${category.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await deleteCategoryApi(
                category.id
            );

            setSuccess(
                "Xóa danh mục thành công."
            );

            await loadCategories();
            await loadServices();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                    "Không thể xóa danh mục. Có thể danh mục đang được sử dụng."
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
                    <h1>Quản lý dịch vụ</h1>

                    <p>
                        Quản lý dịch vụ sửa chữa và danh mục dịch vụ.
                    </p>
                </div>

                <div className="action-buttons">
                    <button
                        className="secondary-button"
                        onClick={
                            openCreateCategoryModal
                        }
                    >
                        + Thêm danh mục
                    </button>

                    <button
                        className="primary-button"
                        onClick={
                            openCreateServiceModal
                        }
                    >
                        + Thêm dịch vụ
                    </button>
                </div>
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
            {/* SERVICE FILTER */}
            {/* ========================= */}

            <div className="filter-panel">
                <div className="filter-field">
                    <label>
                        Tìm kiếm dịch vụ
                    </label>

                    <input
                        type="text"
                        value={keyword}
                        onChange={(event) =>
                            setKeyword(
                                event.target.value
                            )
                        }
                        placeholder="Nhập tên dịch vụ..."
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

                        <option value="INACTIVE">
                            Ngừng hoạt động
                        </option>
                    </select>
                </div>

                <div className="filter-field">
                    <label>
                        Danh mục
                    </label>

                    <select
                        value={categoryFilter}
                        onChange={(event) =>
                            setCategoryFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Tất cả danh mục
                        </option>

                        {categories.map(
                            (category) => (
                                <option
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name}
                                </option>
                            )
                        )}
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
                        onClick={loadServices}
                    >
                        Tìm kiếm
                    </button>
                </div>
            </div>

            {/* ========================= */}
            {/* SERVICE TABLE */}
            {/* ========================= */}

            <div className="table-container">
                {loading ? (
                    <div className="table-state">
                        Đang tải danh sách dịch vụ...
                    </div>
                ) : services.length === 0 ? (
                    <div className="table-state">
                        Không có dịch vụ nào.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Tên dịch vụ</th>
                                <th>Danh mục</th>
                                <th>Giá</th>
                                <th>Mô tả</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {services.map(
                                (service) => (
                                    <tr
                                        key={
                                            service.id
                                        }
                                    >
                                        <td>
                                            {
                                                service.serviceCode
                                            }
                                        </td>

                                        <td>
                                            {
                                                service.name
                                            }
                                        </td>

                                        <td>
                                            {
                                                service
                                                    .category
                                                    .name
                                            }
                                        </td>

                                        <td>
                                            {service.price.toLocaleString(
                                                "vi-VN"
                                            )}{" "}
                                            đ
                                        </td>

                                        <td>
                                            {service.description ||
                                                "—"}
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    service.status ===
                                                    "ACTIVE"
                                                        ? "status active"
                                                        : "status inactive"
                                                }
                                            >
                                                {service.status ===
                                                "ACTIVE"
                                                    ? "Đang hoạt động"
                                                    : "Ngừng hoạt động"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        openEditServiceModal(
                                                            service
                                                        )
                                                    }
                                                >
                                                    Sửa
                                                </button>

                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        handleChangeServiceStatus(
                                                            service
                                                        )
                                                    }
                                                >
                                                    {service.status ===
                                                    "ACTIVE"
                                                        ? "Ngừng"
                                                        : "Kích hoạt"}
                                                </button>

                                                <button
                                                    className="danger-button"
                                                    onClick={() =>
                                                        handleDeleteService(
                                                            service
                                                        )
                                                    }
                                                >
                                                    Xóa
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
            {/* CATEGORY SECTION */}
            {/* ========================= */}

            <div
                className="page-header"
                style={{
                    marginTop: "40px",
                }}
            >
                <h2>
                    Quản lý danh mục
                </h2>

                <p>
                    Danh mục được sử dụng để phân loại dịch vụ sửa chữa.
                </p>
            </div>

            <div className="table-container">
                {categories.length === 0 ? (
                    <div className="table-state">
                        Chưa có danh mục.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên danh mục</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {categories.map(
                                (category) => (
                                    <tr
                                        key={
                                            category.id
                                        }
                                    >
                                        <td>
                                            {
                                                category.id
                                            }
                                        </td>

                                        <td>
                                            {
                                                category.name
                                            }
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    category.status ===
                                                    "ACTIVE"
                                                        ? "status active"
                                                        : "status inactive"
                                                }
                                            >
                                                {category.status ===
                                                "ACTIVE"
                                                    ? "Đang hoạt động"
                                                    : "Ngừng hoạt động"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        openEditCategoryModal(
                                                            category
                                                        )
                                                    }
                                                >
                                                    Sửa
                                                </button>

                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        handleChangeCategoryStatus(
                                                            category
                                                        )
                                                    }
                                                >
                                                    {category.status ===
                                                    "ACTIVE"
                                                        ? "Ngừng"
                                                        : "Kích hoạt"}
                                                </button>

                                                <button
                                                    className="danger-button"
                                                    onClick={() =>
                                                        handleDeleteCategory(
                                                            category
                                                        )
                                                    }
                                                >
                                                    Xóa
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
            {/* SERVICE MODAL */}
            {/* ========================= */}

            {showServiceModal && (
                <div className="modal-overlay">
                    <div className="modal customer-modal">
                        <div className="modal-header">
                            <h2>
                                {editingService
                                    ? "Sửa dịch vụ"
                                    : "Thêm dịch vụ"}
                            </h2>

                            <button
                                className="modal-close"
                                type="button"
                                onClick={
                                    closeServiceModal
                                }
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleServiceSubmit
                            }
                        >
                            <div className="form-group">
                                <label>
                                    Tên dịch vụ
                                </label>

                                <input
                                    type="text"
                                    value={
                                        serviceForm.name
                                    }
                                    onChange={(event) =>
                                        setServiceForm(
                                            {
                                                ...serviceForm,
                                                name: event
                                                    .target
                                                    .value,
                                            }
                                        )
                                    }
                                    placeholder="VD: Vệ sinh laptop"
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
                                    Danh mục
                                </label>

                                <select
                                    value={
                                        serviceForm.categoryId ||
                                        ""
                                    }
                                    onChange={(event) =>
                                        setServiceForm(
                                            {
                                                ...serviceForm,
                                                categoryId:
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    ),
                                            }
                                        )
                                    }
                                    required
                                >
                                    <option value="">
                                        -- Chọn danh mục --
                                    </option>

                                    {categories
                                        .filter(
                                            (
                                                category
                                            ) =>
                                                category.status ===
                                                "ACTIVE"
                                        )
                                        .map(
                                            (
                                                category
                                            ) => (
                                                <option
                                                    key={
                                                        category.id
                                                    }
                                                    value={
                                                        category.id
                                                    }
                                                >
                                                    {
                                                        category.name
                                                    }
                                                </option>
                                            )
                                        )}
                                </select>
                            </div>

                            <div
                                className="form-group"
                                style={{
                                    marginTop: "16px",
                                }}
                            >
                                <label>
                                    Giá dịch vụ
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={
                                        serviceForm.price
                                    }
                                    onChange={(event) =>
                                        setServiceForm(
                                            {
                                                ...serviceForm,
                                                price: Number(
                                                    event
                                                        .target
                                                        .value
                                                ),
                                            }
                                        )
                                    }
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
                                    Mô tả
                                </label>

                                <textarea
                                    rows={4}
                                    value={
                                        serviceForm.description ||
                                        ""
                                    }
                                    onChange={(event) =>
                                        setServiceForm(
                                            {
                                                ...serviceForm,
                                                description:
                                                    event
                                                        .target
                                                        .value,
                                            }
                                        )
                                    }
                                    placeholder="Nhập mô tả dịch vụ..."
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        closeServiceModal
                                    }
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
                                        : editingService
                                        ? "Cập nhật"
                                        : "Thêm dịch vụ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================= */}
            {/* CATEGORY MODAL */}
            {/* ========================= */}

            {showCategoryModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>
                                {editingCategory
                                    ? "Sửa danh mục"
                                    : "Thêm danh mục"}
                            </h2>

                            <button
                                className="modal-close"
                                type="button"
                                onClick={
                                    closeCategoryModal
                                }
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleCategorySubmit
                            }
                        >
                            <div className="form-group">
                                <label>
                                    Tên danh mục
                                </label>

                                <input
                                    type="text"
                                    value={
                                        categoryName
                                    }
                                    onChange={(event) =>
                                        setCategoryName(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="VD: Phần cứng"
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        closeCategoryModal
                                    }
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
                                        : editingCategory
                                        ? "Cập nhật"
                                        : "Thêm danh mục"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminServices;