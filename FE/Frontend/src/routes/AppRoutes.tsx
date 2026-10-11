import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

// AUTH
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

// LAYOUT
import CustomerLayout from "../layouts/CustomerLayout";
import EmployeeLayout from "../layouts/EmployeeLayout";
import AdminLayout from "../layouts/AdminLayout";

// CUSTOMER
import EditProfile from "../pages/customer/EditProfile";
import BookAppointment from "../pages/customer/BookAppointment";
import Appointments from "../pages/customer/Appointments";
import RepairTracking from "../pages/customer/RepairTracking";
import QuoteApproval from "../pages/customer/QuoteApproval";
import Payment from "../pages/customer/Payment";
import RepairHistory from "../pages/customer/RepairHistory";
import ServiceReview from "../pages/customer/ServiceReview";
import WarrantyRequest from "../pages/customer/WarrantyRequest";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerServices from "../pages/customer/CustomerServices";

// EMPLOYEE
import EmployeeDashboard from "../pages/employee/Dashboard";
import EmployeeProfile from "../pages/employee/Profile";
import EmployeeReceiveDevice from "../pages/employee/ReceiveDevice";
import EmployeeRepairs from "../pages/employee/Repairs";
import EmployeeDiagnosis from "../pages/employee/Diagnosis";
import EmployeeQuotes from "../pages/employee/Quotes";
import EmployeeAppointments from "../pages/employee/Appointments";
import EmployeeRepairProcess from "../pages/employee/RepairProcess";
import EmployeeCompleteRepair from "../pages/employee/CompleteRepair";

// ADMIN
import AdminDashboard from "../pages/admin/Dashboard";
import AdminProfile from "../pages/admin/Profile";
import AdminEmployees from "../pages/admin/Employees";
import AdminServices from "../pages/admin/Services";
import AdminCustomers from "../pages/admin/Customers";
import AdminRepairs from "../pages/admin/Repairs";
import AdminReports from "../pages/admin/Reports";

// PROTECTED
import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>

                {/* ==================== AUTH ==================== */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />


                {/* ==================== CUSTOMER ==================== */}

                <Route
                    element={
                        <ProtectedRoute
                            allowedRoles={["CUSTOMER"]}
                        />
                    }
                >
                    <Route
                        path="/customer"
                        element={<CustomerLayout />}
                    >
                        <Route
                            index
                            element={<CustomerDashboard />}
                        />

                        {/* 04 */}
                        <Route
                            path="profile"
                            element={<EditProfile />}
                        />

                        {/* 05 */}
                        <Route
                            path="services"
                            element={<CustomerServices />}
                        />

                        {/* 06 */}
                        <Route
                            path="book-appointment"
                            element={<BookAppointment />}
                        />

                        {/* 07 */}
                        <Route
                            path="appointments"
                            element={<Appointments />}
                        />

                        {/* 08 */}
                        <Route
                            path="repair-tracking"
                            element={<RepairTracking />}
                        />

                        {/* 09 */}
                        <Route
                            path="quotes"
                            element={<QuoteApproval />}
                        />

                        {/* 10 */}
                        <Route
                            path="payment"
                            element={<Payment />}
                        />

                        {/* 11 */}
                        <Route
                            path="repair-history"
                            element={<RepairHistory />}
                        />

                        {/* 12 */}
                        <Route
                            path="reviews"
                            element={<ServiceReview />}
                        />

                        {/* 13 */}
                        <Route
                            path="warranty"
                            element={<WarrantyRequest />}
                        />
                    </Route>
                </Route>


                {/* ==================== EMPLOYEE ==================== */}

                <Route
                    element={
                        <ProtectedRoute
                            allowedRoles={["EMPLOYEE"]}
                        />
                    }
                >
                    <Route
                        path="/employee"
                        element={<EmployeeLayout />}
                    >
                        <Route
                            index
                            element={<EmployeeDashboard />}
                        />

                        <Route
                            path="profile"
                            element={<EmployeeProfile />}
                        />

                        {/* 14 */}
                        <Route
                            path="receive-device"
                            element={<EmployeeReceiveDevice />}
                        />

                        {/* 15 */}
                        <Route
                            path="repairs"
                            element={<EmployeeRepairs />}
                        />

                        {/* 16 */}
                        <Route
                            path="diagnosis"
                            element={<EmployeeDiagnosis />}
                        />

                        {/* 17 */}
                        <Route
                            path="quotes"
                            element={<EmployeeQuotes />}
                        />

                        {/* 18 */}
                        <Route
                            path="appointments"
                            element={<EmployeeAppointments />}
                        />

                        {/* 19 */}
                        <Route
                            path="repair-process"
                            element={<EmployeeRepairProcess />}
                        />

                        {/* 20 */}
                        <Route
                            path="complete-repair"
                            element={<EmployeeCompleteRepair />}
                        />
                    </Route>
                </Route>


                {/* ==================== ADMIN ==================== */}

                <Route
                    element={
                        <ProtectedRoute
                            allowedRoles={["ADMIN"]}
                        />
                    }
                >
                    <Route
                        path="/admin"
                        element={<AdminLayout />}
                    >
                        <Route
                            index
                            element={<AdminDashboard />}
                        />

                        <Route
                            path="profile"
                            element={<AdminProfile />}
                        />

                        {/* 21 */}
                        <Route
                            path="employees"
                            element={<AdminEmployees />}
                        />

                        {/* 22 */}
                        <Route
                            path="services"
                            element={<AdminServices />}
                        />

                        {/* 23 */}
                        <Route
                            path="customers"
                            element={<AdminCustomers />}
                        />

                        {/* 24 */}
                        <Route
                            path="repairs"
                            element={<AdminRepairs />}
                        />

                        {/* 25 */}
                        <Route
                            path="reports"
                            element={<AdminReports />}
                        />
                    </Route>
                </Route>


                {/* ==================== 403 ==================== */}

                <Route
                    path="/403"
                    element={
                        <div style={{ padding: "40px" }}>
                            <h1>403</h1>

                            <p>
                                Bạn không có quyền truy cập trang này.
                            </p>
                        </div>
                    }
                />


                {/* ==================== 404 ==================== */}

                <Route
                    path="*"
                    element={
                        <div style={{ padding: "40px" }}>
                            <h1>404</h1>

                            <p>
                                Không tìm thấy trang.
                            </p>
                        </div>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;