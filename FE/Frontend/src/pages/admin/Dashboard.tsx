import { ArrowUpRight, ChartColumn, ContactRound, UserRound, Users, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const adminSections = [
    {
        title: "Nhân viên",
        description: "Quản lý tài khoản và thông tin nhân viên.",
        path: "/admin/employees",
        icon: Users,
    },
    {
        title: "Dịch vụ",
        description: "Cập nhật dịch vụ sửa chữa và danh mục.",
        path: "/admin/services",
        icon: Wrench,
    },
    {
        title: "Khách hàng",
        description: "Tra cứu và quản lý thông tin khách hàng.",
        path: "/admin/customers",
        icon: ContactRound,
    },
    {
        title: "Phiếu sửa chữa",
        description: "Theo dõi các phiếu sửa chữa trong hệ thống.",
        path: "/admin/repairs",
        icon: Wrench,
    },
    {
        title: "Báo cáo",
        description: "Xem báo cáo và thống kê hoạt động.",
        path: "/admin/reports",
        icon: ChartColumn,
    },
    {
        title: "Thông tin cá nhân",
        description: "Xem và cập nhật hồ sơ quản trị viên.",
        path: "/admin/profile",
        icon: UserRound,
    },
];

function AdminDashboard() {
    return (
        <main className="dashboard-page">
            <section className="dashboard-hero">
                <div className="dashboard-hero-copy">
                    <span className="dashboard-eyebrow">FIXHUB · QUẢN TRỊ</span>
                    <h1>Bảng điều khiển</h1>
                    <p>Quản lý dịch vụ sửa chữa máy tính trong một nơi.</p>
                </div>
                <Link className="dashboard-hero-link" to="/admin/reports">
                    Xem báo cáo <ArrowUpRight size={18} />
                </Link>
            </section>

            <section className="dashboard-section" aria-labelledby="admin-pages-title">
                <div className="dashboard-section-heading">
                    <div>
                        <h2 id="admin-pages-title">Khu vực quản lý</h2>
                        <p>Chọn chức năng bạn muốn truy cập.</p>
                    </div>
                </div>

                <div className="dashboard-link-grid">
                    {adminSections.map(({ title, description, path, icon: Icon }, index) => (
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

export default AdminDashboard;
