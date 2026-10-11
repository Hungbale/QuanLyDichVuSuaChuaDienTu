import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
    createCategoryApi,
    updateCategoryApi,
    getCategoriesApi,
    changeCategoryStatusApi,
    deleteCategoryApi,
} from "../../api/categoryApi";

import type {
    Category,
    CategoryRequest,
} from "../../types/category";

function Categories() {
    const [categories, setCategories] = useState<Category[]>([]);

    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] =
        useState<Category | null>(null);

    const [form, setForm] = useState<CategoryRequest>({
        name: "",
    });

    const loadCategories = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getCategoriesApi(
                status || undefined
            );

            setCategories(data);
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                "Không thể tải danh sách danh mục."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, [status]);

    const openCreateModal = () => {
        setEditingCategory(null);

        setForm({
            name: "",
        });

        setError("");
        setSuccess("");

        setShowModal(true);
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);

        setForm({
            name: category.name,
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
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!form.name.trim()) {
            setError("Tên danh mục không được để trống.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            if (editingCategory) {
                await updateCategoryApi(
                    editingCategory.id,
                    {
                        name: form.name.trim(),
                    }
                );

                setSuccess(
                    "Cập nhật danh mục thành công."
                );
            } else {
                await createCategoryApi({
                    name: form.name.trim(),
                });

                setSuccess(
                    "Thêm danh mục thành công."
                );
            }

            setShowModal(false);

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

    const handleChangeStatus = async (
        category: Category
    ) => {
        const action =
            category.status === "ACTIVE"
                ? "vô hiệu hóa"
                : "kích hoạt";

        const confirmed = window.confirm(
            `Bạn có chắc muốn ${action} danh mục "${category.name}" không?`
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
                `Đã ${action} danh mục thành công.`
            );

            await loadCategories();
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                "Không thể thay đổi trạng thái danh mục."
            );
        }
    };

    const handleDelete = async (
        category: Category
    ) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa danh mục "${category.name}" không?`
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
        } catch (error: any) {
            console.error(error);

            setError(
                error.response?.data?.message ||
                "Không thể xóa danh mục. Có thể danh mục đang được sử dụng."
            );
        }
    };

    const filteredCategories = categories.filter(
        (category) =>
            category.name
                .toLowerCase()
                .includes(keyword.toLowerCase())
    );

    return (
        <div className="management-page">

            {/* HEADER */}

            <div className="page-header management-header">
                <div>
                    <h1>Quản lý danh mục</h1>

                    <p>
                        Quản lý các danh mục dịch vụ sửa chữa.
                    </p>
                </div>

                <button
                    className="primary-button"
                    onClick={openCreateModal}
                >
                    + Thêm danh mục
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

            <div className="filter-panel">

                <div className="filter-field">
                    <label>
                        Tìm kiếm
                    </label>

                    <input
                        type="text"
                        placeholder="Nhập tên danh mục..."
                        value={keyword}
                        onChange={(event) =>
                            setKeyword(event.target.value)
                        }
                    />
                </div>

                <div className="filter-field">
                    <label>
                        Trạng thái
                    </label>

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value)
                        }
                    >
                        <option value="">
                            Tất cả
                        </option>

                        <option value="ACTIVE">
                            Đang hoạt động
                        </option>

                        <option value="INACTIVE">
                            Đã vô hiệu hóa
                        </option>
                    </select>
                </div>

            </div>

            {/* TABLE */}

            <div className="table-container">

                {loading ? (
                    <div className="table-state">
                        Đang tải dữ liệu...
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="table-state">
                        Không có danh mục nào.
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
                            {filteredCategories.map(
                                (category) => (
                                    <tr
                                        key={category.id}
                                    >
                                        <td>
                                            {category.id}
                                        </td>

                                        <td>
                                            <strong>
                                                {category.name}
                                            </strong>
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
                                                    : "Đã vô hiệu hóa"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="action-buttons">

                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        openEditModal(
                                                            category
                                                        )
                                                    }
                                                >
                                                    Sửa
                                                </button>

                                                <button
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        handleChangeStatus(
                                                            category
                                                        )
                                                    }
                                                >
                                                    {category.status ===
                                                    "ACTIVE"
                                                        ? "Vô hiệu hóa"
                                                        : "Kích hoạt"}
                                                </button>

                                                <button
                                                    className="danger-button"
                                                    onClick={() =>
                                                        handleDelete(
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

            {/* MODAL */}

            {showModal && (
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
                                onClick={closeModal}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                        >
                            <div className="form-group">
                                <label>
                                    Tên danh mục
                                </label>

                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            name: event.target.value,
                                        })
                                    }
                                    placeholder="Ví dụ: Sửa phần cứng"
                                    required
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
                                        : "Lưu"}
                                </button>

                            </div>
                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}

export default Categories;