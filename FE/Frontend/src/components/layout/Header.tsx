import { useAuth } from "../../context/AuthContext";

function Header() {
    const { user } = useAuth();

    return (
        <header
            style={{
                height: "70px",
                background: "#fff",
                borderBottom: "1px solid #ddd",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 30px",
            }}
        >
            <div>
                <h2
                    style={{
                        margin: 0,
                        fontSize: "20px",
                    }}
                >
                    {user?.role === "CUSTOMER"
                        ? "Khu vực khách hàng"
                        : "Khu vực nhân viên"}
                </h2>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <div
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#111",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                    }}
                >
                    {user?.email?.charAt(0).toUpperCase()}
                </div>

                <div>
                    <div
                        style={{
                            fontSize: "14px",
                            fontWeight: 600,
                        }}
                    >
                        {user?.email}
                    </div>

                    <div
                        style={{
                            fontSize: "12px",
                            color: "#777",
                        }}
                    >
                        {user?.role}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;