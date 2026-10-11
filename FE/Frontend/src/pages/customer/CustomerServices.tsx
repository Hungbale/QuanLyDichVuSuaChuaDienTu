import { useEffect, useState } from "react";

import { getServicesApi } from "../../api/serviceApi";

import type { ServiceItem } from "../../types/service";

function CustomerServices() {
    const [services, setServices] = useState<ServiceItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [keyword, setKeyword] = useState("");

    const loadServices = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getServicesApi({
                keyword: keyword.trim() || undefined,
                status: "ACTIVE",
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

    useEffect(() => {
        loadServices();
    }, []);

    const handleSearch = () => {
        loadServices();
    };

    return (
        <div className="management-page">
            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <div className="page-header">
                <h1>Xem dịch vụ</h1>

                <p>
                    Xem các dịch vụ sửa chữa đang được cung cấp.
                </p>
            </div>

            {/* ========================= */}
            {/* ERROR */}
            {/* ========================= */}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* ========================= */}
            {/* SEARCH */}
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
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter"
                            ) {
                                handleSearch();
                            }
                        }}
                        placeholder="Nhập tên dịch vụ..."
                    />
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-end",
                    }}
                >
                    <button
                        className="primary-button"
                        onClick={handleSearch}
                    >
                        Tìm kiếm
                    </button>
                </div>
            </div>

            {/* ========================= */}
            {/* SERVICES */}
            {/* ========================= */}

            <div className="table-container">
                {loading ? (
                    <div className="table-state">
                        Đang tải danh sách dịch vụ...
                    </div>
                ) : services.length === 0 ? (
                    <div className="table-state">
                        <h3>
                            Không có dịch vụ
                        </h3>

                        <p>
                            Hiện chưa có dịch vụ sửa chữa
                            phù hợp với tìm kiếm.
                        </p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    Mã dịch vụ
                                </th>

                                <th>
                                    Tên dịch vụ
                                </th>

                                <th>
                                    Danh mục
                                </th>

                                <th>
                                    Giá
                                </th>

                                <th>
                                    Mô tả
                                </th>

                                <th>
                                    Trạng thái
                                </th>
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
                                            <span className="status active">
                                                Đang hoạt động
                                            </span>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default CustomerServices;