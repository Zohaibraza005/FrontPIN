//@ts-nocheck
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Attendance } from "./pages/Attendance";
import { Schedule } from "./pages/Schedule";
import { Projects } from "./pages/Projects";
import { Tasks } from "./pages/Tasks";
import { Invoices } from "./pages/Invoices";
import { Leave } from "./pages/Leave";
import { Overtime } from "./pages/Overtime";
import { Employees } from "./pages/Employees";
import { Payroll } from "./pages/Payroll";


import { Performance } from "./pages/Performance";
import { Assets } from "./pages/Assets";
import { Reports } from "./pages/Reports";
import { NotFound } from "./pages/NotFound";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { TourProvider } from "./contexts/TourContext";
import { DetailProject } from "./pages/DetailProject";
import { EmployeeDetail } from "./pages/EmployeeDetail";
import { Departments } from "./pages/Departments";
import { Entities } from "./pages/Entities";
import CreateInvoice from "./pages/CreateInvoice";
import { InvoiceView } from "./pages/InvoiceView";
import EditInvoice from "./pages/EditInvoice";
import { PayrollDetail } from "./pages/PayrollDetail";
import { StatsDetails } from "./pages/StatsDetail";
import { AddEmployee } from "./pages/AddEmployee";
import Applicants from "./pages/Applicants";
import PostJob from "./pages/PostJob";
import Jobs from "./pages/Jobs";
import JobApplicants from "./pages/JobApplicants";
import Organization from "./pages/Organization";
import { Register } from "./pages/Register";
import { Profile } from "./pages/Profile";
import { Roles } from "./pages/Roles";

// Wrapper component for providers
import { Navigate } from "react-router";
import Locations from "./pages/Locations";
import AttendanceDashboard from "./pages/AttendanceDashboard";
  

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <TourProvider>
          {children}
        </TourProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <ProvidersWrapper>
        <PublicRoute>
          <Login />
        </PublicRoute>
      </ProvidersWrapper>
    ),
  },
  {
    path: "/register",
    element: (
      <ProvidersWrapper>
        <PublicRoute>
          <Register />
        </PublicRoute>
      </ProvidersWrapper>
    ),
  },
  {
    path: "/",
    element: <ProvidersWrapper><Layout /></ProvidersWrapper>,
    children: [
      { index: true, Component: Dashboard },
      { path: "stats/:category", Component: StatsDetails },
      { path: "attendance", Component: Attendance },
      { path: "attendance-dashboard", Component: AttendanceDashboard },
      { path: "schedule", Component: Schedule },
      { path: "projects", Component: Projects },
      { path: "projects/:id", Component: DetailProject },
      { path: "tasks", Component: Tasks },
      { path: "invoices", Component: Invoices },
      { path: "invoices/add-new", Component: CreateInvoice },
      { path: "invoices/view/:id", Component: InvoiceView },
      { path: "invoices/edit/:id", Component: EditInvoice },
      { path: "leave", Component: Leave },
      { path: "overtime", Component: Overtime },
      { path: "employees", Component: Employees },
      { path: "employees/add", Component: AddEmployee },
      { path: "employees/:id", Component: EmployeeDetail },
      { path: "roles", Component: Roles },
      { path: "departments", Component: Departments },
      { path: "payroll", Component: Payroll },
      { path: "payroll/view/:id", Component: PayrollDetail},
      { path: "locations", Component: Locations },
      { path: "entities", Component: Entities },
      { path: "applicants", Component: Applicants },
      { path: "jobs/add", Component: PostJob },
    { path: "jobs/:jobId/applicants", Component: JobApplicants },
      { path: "jobs", Component: Jobs },
      { path: "organization", Component: Organization },
      { path: "performance", Component: Performance },
      { path: "assets", Component: Assets },
      { path: "reports", Component: Reports },
      { path: "profile", Component: Profile },
      { path: "*", Component: NotFound },
    ],
  },
]);
// 