import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function AdminProfile() {
    const { user } = useAuth();

    return (
        <main className="management-page appointment-page profile-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · QUẢN TRỊ VIÊN</span>
                <h1>Thông tin cá nhân</h1>
                <p>Xem thông tin tài khoản đang sử dụng trong hệ thống.</p>
            </header>

            <section className="profile-card admin-profile-card">
                <div className="admin-profile-identity">
                    <div className="admin-profile-avatar" aria-hidden="true"><UserRound size={30} /></div>
                    <div>
                        <span className="appointment-eyebrow">TÀI KHOẢN QUẢN TRỊ</span>
                        <h2>Quản trị viên</h2>
                        <p>{user?.email || "Chưa có địa chỉ email"}</p>
                    </div>
                    <span className="admin-profile-role"><ShieldCheck size={16} /> Quản trị viên</span>
                </div>

                <div className="admin-profile-section-heading">
                    <h3>Thông tin tài khoản</h3>
                </div>

                <div className="admin-profile-meta-grid">
                    <article className="admin-profile-meta">
                        <span className="admin-profile-meta-icon"><Mail size={18} /></span>
                        <div><small>Địa chỉ thư điện tử</small><strong>{user?.email || "Chưa có thông tin"}</strong></div>
                    </article>
                    <article className="admin-profile-meta">
                        <span className="admin-profile-meta-icon"><ShieldCheck size={18} /></span>
                        <div><small>Vai trò hệ thống</small><strong>Quản trị viên</strong></div>
                    </article>
                </div>
            </section>
        </main>
    );
}

export default AdminProfile;
