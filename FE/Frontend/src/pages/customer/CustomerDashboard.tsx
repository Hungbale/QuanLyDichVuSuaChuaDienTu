import {
    ArrowUpRight,
    CalendarDays,
    CalendarPlus,
    CreditCard,
    ClipboardCheck,
    FileText,
    History,
    ShieldCheck,
    Star,
    UserRound,
    Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

const customerSections = [
    {
        title: "Dịch vụ sửa chữa",
        description: "Xem các dịch vụ đang được cung cấp.",
        path: "/customer/services",
        icon: Wrench,
    },
    {
        title: "Đặt lịch sửa chữa",
        description: "Gửi yêu cầu đặt lịch tiếp nhận thiết bị.",
        path: "/customer/book-appointment",
        icon: CalendarPlus,
    },
    {
        title: "Lịch hẹn của tôi",
        description: "Xem và quản lý các lịch hẹn đã tạo.",
        path: "/customer/appointments",
        icon: CalendarDays,
    },
    {
        title: "Theo dõi sửa chữa",
        description: "Theo dõi tiến độ xử lý thiết bị.",
        path: "/customer/repair-tracking",
        icon: ClipboardCheck,
    },
    {
        title: "Duyệt báo giá",
        description: "Xem và phản hồi báo giá sửa chữa.",
        path: "/customer/quotes",
        icon: FileText,
    },
    {
        title: "Lịch sử sửa chữa",
        description: "Tra cứu các lần sửa chữa trước đây.",
        path: "/customer/repair-history",
        icon: History,
    },
    {
        title: "Yêu cầu bảo hành",
        description: "Gửi yêu cầu hỗ trợ bảo hành thiết bị.",
        path: "/customer/warranty",
        icon: ShieldCheck,
    },
    {
        title: "Thanh toán",
        description: "Xem thông tin và trạng thái thanh toán.",
        path: "/customer/payment",
        icon: CreditCard,
    },
    {
        title: "Đánh giá dịch vụ",
        description: "Gửi đánh giá về trải nghiệm sửa chữa.",
        path: "/customer/reviews",
        icon: Star,
    },
    {
        title: "Thông tin cá nhân",
        description: "Xem và cập nhật hồ sơ khách hàng.",
        path: "/customer/profile",
        icon: UserRound,
    },
];

function CustomerDashboard() {
    return (
        <main className="dashboard-page">
            <section className="dashboard-hero dashboard-hero-customer">
                <div className="dashboard-hero-copy">
                    <span className="dashboard-eyebrow">FIXHUB · KHÁCH HÀNG</span>
                    <h1>Xin chào, chào mừng bạn trở lại</h1>
                    <p>Đặt lịch, theo dõi sửa chữa và quản lý dịch vụ của bạn.</p>
                </div>
                <Link className="dashboard-hero-link" to="/customer/book-appointment">
                    Đặt lịch ngay <ArrowUpRight size={18} />
                </Link>
            </section>

            <section className="dashboard-section" aria-labelledby="customer-pages-title">
                <div className="dashboard-section-heading">
                    <div>
                        <h2 id="customer-pages-title">Dịch vụ dành cho bạn</h2>
                        <p>Truy cập nhanh các chức năng thường dùng.</p>
                    </div>
                </div>

                <div className="dashboard-link-grid">
                    {customerSections.map(({ title, description, path, icon: Icon }, index) => (
                        <Link className="dashboard-link-card" to={path} key={path}>
                            <div className={`dashboard-card-icon dashboard-tone-${index % 5}`}>
                                <Icon size={21} strokeWidth={1.9} />
                            </div>
                            <h3>{title}</h3>
                            <p>{description}</p>
                            <span className="dashboard-card-action">
                                Mở chức năng <ArrowUpRight size={16} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default CustomerDashboard;
