import {
    ArrowUpRight,
    CalendarDays,
    CheckCheck,
    ClipboardList,
    MonitorCog,
    Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

const employeeSections = [
    {
        title: "Phiếu sửa chữa",
        description: "Xem danh sách phiếu sửa chữa.",
        path: "/employee/repairs",
        icon: ClipboardList,
    },
    {
        title: "Báo giá",
        description: "Tạo và gửi báo giá cho khách hàng.",
        path: "/employee/quotes",
        icon: ClipboardList,
    },
    {
        title: "L\u1ecbch h\u1eb9n v\u00e0 ti\u1ebfp nh\u1eadn",
        description: "Xem l\u1ecbch h\u1eb9n v\u00e0 ti\u1ebfp nh\u1eadn thi\u1ebft b\u1ecb theo l\u1ecbch \u0111\u01b0\u1ee3c giao.",
        path: "/employee/appointments",
        icon: CalendarDays,
    },
    {
        title: "Thực hiện sửa chữa",
        description: "Cập nhật tiến trình sửa chữa thiết bị.",
        path: "/employee/repair-process",
        icon: Wrench,
    },
    {
        title: "Hoàn tất sửa chữa",
        description: "Kiểm tra và xác nhận hoàn thành.",
        path: "/employee/complete-repair",
        icon: CheckCheck,
    },
    {
        title: "Thông tin cá nhân",
        description: "Xem và cập nhật hồ sơ nhân viên.",
        path: "/employee/profile",
        icon: MonitorCog,
    },
];

function EmployeeDashboard() {
    return (
        <main className="dashboard-page">
            <section className="dashboard-hero dashboard-hero-employee">
                <div className="dashboard-hero-copy">
                    <span className="dashboard-eyebrow">FIXHUB · NHÂN VIÊN</span>
                    <h1>Bảng điều khiển</h1>
                    <p>Truy cập nhanh các công việc trong quy trình sửa chữa.</p>
                </div>
                <Link className="dashboard-hero-link" to="/employee/repairs">
                    Mở phiếu sửa chữa <ArrowUpRight size={18} />
                </Link>
            </section>

            <section className="dashboard-section" aria-labelledby="employee-pages-title">
                <div className="dashboard-section-heading">
                    <div>
                        <h2>Công việc</h2>
                        <p id="employee-pages-title">Chọn một bước trong quy trình để tiếp tục.</p>
                    </div>
                </div>

                <div className="dashboard-link-grid">
                    {employeeSections.map(({ title, description, path, icon: Icon }, index) => (
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

export default EmployeeDashboard;
