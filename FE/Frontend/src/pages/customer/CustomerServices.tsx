import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarPlus, Search, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

import { getCategoriesApi } from "../../api/categoryApi";
import { getServicesApi } from "../../api/serviceApi";
import type { Category } from "../../types/category";
import type { ServiceItem } from "../../types/service";

function CustomerServices() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [featuredServices, setFeaturedServices] = useState<ServiceItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [keyword, setKeyword] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [loading, setLoading] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState("");
    const [categoryError, setCategoryError] = useState("");

    useEffect(() => {
        let active = true;

        const loadInitialData = async () => {
            setLoading(true);

            const [serviceResult, categoryResult] = await Promise.allSettled([
                getServicesApi({ status: "ACTIVE" }),
                getCategoriesApi("ACTIVE"),
            ]);

            if (!active) return;

            if (serviceResult.status === "fulfilled") {
                setServices(serviceResult.value);
                setFeaturedServices(serviceResult.value.slice(0, 4));
            } else {
                const requestError = serviceResult.reason;
                setError(
                    requestError?.response?.data?.message ||
                        "Không thể tải danh sách dịch vụ. Vui lòng thử lại sau."
                );
            }

            if (categoryResult.status === "fulfilled") {
                setCategories(categoryResult.value);
            } else {
                setCategoryError("Không thể tải nhóm dịch vụ.");
            }

            setLoading(false);
        };

        loadInitialData();
        return () => {
            active = false;
        };
    }, []);

    const featuredIds = useMemo(
        () => new Set(featuredServices.map((service) => service.id)),
        [featuredServices]
    );

    const displayedServices = hasSearched
        ? services
        : services.filter((service) => !featuredIds.has(service.id));

    const handleSearch = async () => {
        setLoading(true);
        setError("");
        setHasSearched(true);

        try {
            const data = await getServicesApi({
                keyword: keyword.trim() || undefined,
                categoryId: categoryId ? Number(categoryId) : undefined,
                status: "ACTIVE",
            });
            setServices(data);
        } catch (requestError: any) {
            console.error(requestError);
            setError(
                requestError.response?.data?.message ||
                    "Không thể tìm dịch vụ. Vui lòng thử lại sau."
            );
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    const resetSearch = async () => {
        setKeyword("");
        setCategoryId("");
        setHasSearched(false);
        setLoading(true);
        setError("");

        try {
            const data = await getServicesApi({ status: "ACTIVE" });
            setServices(data);
            setFeaturedServices(data.slice(0, 4));
        } catch (requestError: any) {
            console.error(requestError);
            setError(
                requestError.response?.data?.message ||
                    "Không thể tải danh sách dịch vụ. Vui lòng thử lại sau."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="customer-services-page">
            <header className="customer-services-header">
                <span className="dashboard-eyebrow">FIXHUB · DỊCH VỤ</span>
                <h1>Danh sách dịch vụ sửa chữa</h1>
                <p>Chọn dịch vụ phù hợp và đặt lịch sửa chữa thiết bị của bạn.</p>
            </header>

            {error && <div className="error-message" role="alert">{error}</div>}

            {featuredServices.length > 0 && (
                <section className="service-featured-section" aria-labelledby="featured-services-title">
                    <div className="service-section-heading">
                        <div>
                            <span className="service-section-kicker">ĐƯỢC CUNG CẤP TẠI FIXHUB</span>
                            <h2 id="featured-services-title">Dịch vụ nổi bật</h2>
                        </div>
                        <span className="service-section-note">Các dịch vụ đang hoạt động</span>
                    </div>

                    <div className="service-featured-grid">
                        {featuredServices.map((service, index) => (
                            <article className={`service-highlight-card service-highlight-${index + 1}`} key={service.id}>
                                <div className="service-highlight-topline">
                                    <span className="service-highlight-icon"><Wrench size={19} /></span>
                                    <span className="service-featured-badge">Nổi bật</span>
                                </div>
                                <span className="service-card-category">{service.category.name}</span>
                                <h3>{service.name}</h3>
                                <p className="service-card-description">
                                    {service.description || "Dịch vụ sửa chữa được thực hiện bởi đội ngũ kỹ thuật viên FIXHUB."}
                                </p>
                                <div className="service-card-price-row">
                                    <span>Giá tham khảo</span>
                                    <strong>Từ {service.price.toLocaleString("vi-VN")} đ</strong>
                                </div>
                                <Link className="service-book-link" to="/customer/book-appointment">
                                    <CalendarPlus size={17} /> Đặt lịch
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <section className="service-lookup-panel" aria-labelledby="service-lookup-title">
                <div className="service-lookup-heading">
                    <div className="service-lookup-icon"><Search size={19} /></div>
                    <div>
                        <h2 id="service-lookup-title">Tra cứu dịch vụ</h2>
                        <p>Tìm theo tên dịch vụ hoặc nhóm dịch vụ.</p>
                    </div>
                </div>

                <div className="service-lookup-fields">
                    <div className="service-lookup-field">
                        <label htmlFor="service-keyword">Từ khóa</label>
                        <input
                            id="service-keyword"
                            type="search"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") handleSearch();
                            }}
                            placeholder="Tên dịch vụ"
                        />
                    </div>
                    <div className="service-lookup-field">
                        <label htmlFor="service-category">Nhóm dịch vụ</label>
                        <select
                            id="service-category"
                            value={categoryId}
                            onChange={(event) => setCategoryId(event.target.value)}
                        >
                            <option value="">Tất cả nhóm dịch vụ</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button className="service-search-button" type="button" onClick={handleSearch} disabled={loading}>
                        <Search size={17} /> Tìm dịch vụ
                    </button>
                    {hasSearched && (
                        <button className="service-reset-button" type="button" onClick={resetSearch} disabled={loading}>
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
                {categoryError && <p className="service-category-error">{categoryError}</p>}
            </section>

            <section className="service-catalog-section" aria-labelledby="service-catalog-title">
                <div className="service-section-heading">
                    <div>
                        <span className="service-section-kicker">DANH MỤC</span>
                        <h2 id="service-catalog-title">
                            {hasSearched ? "Kết quả tra cứu" : "Tất cả dịch vụ"}
                        </h2>
                    </div>
                    {!loading && <span className="service-result-count">{displayedServices.length} dịch vụ</span>}
                </div>

                {loading ? (
                    <div className="service-catalog-state">Đang tải dịch vụ...</div>
                ) : displayedServices.length === 0 ? (
                    <div className="service-catalog-state">
                        <div className="service-empty-icon"><Wrench size={22} /></div>
                        <h3>{hasSearched ? "Không tìm thấy dịch vụ phù hợp" : "Bạn đã xem hết dịch vụ"}</h3>
                        <p>
                            {hasSearched
                                ? "Thử đổi từ khóa hoặc chọn một nhóm dịch vụ khác."
                                : "Các dịch vụ hiện có đang được giới thiệu ở phần nổi bật phía trên."}
                        </p>
                        {hasSearched && (
                            <button className="service-reset-button" type="button" onClick={resetSearch}>
                                Xem tất cả dịch vụ
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="service-catalog-grid">
                        {displayedServices.map((service) => (
                            <article className="service-catalog-card" key={service.id}>
                                <span className="service-catalog-category">{service.category.name}</span>
                                <h3>{service.name}</h3>
                                <p>{service.description || "Liên hệ FIXHUB để biết thêm thông tin về dịch vụ."}</p>
                                <div className="service-catalog-card-footer">
                                    <strong>{service.price.toLocaleString("vi-VN")} đ</strong>
                                    <Link to="/customer/book-appointment" aria-label={`Đặt lịch ${service.name}`}>
                                        Đặt lịch <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

export default CustomerServices;
