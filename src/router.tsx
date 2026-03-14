import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { RequireAccess } from "./components/RequireAccess";
import { LoginPage } from "./pages/LoginPage";
import { CalendarPage } from "./pages/calendar/CalendarPage";
import { StocksPage } from "./pages/stocks/StocksPage";
import { MyThesesPage } from "./pages/stocks/MyThesesPage";
import { StockDetailPage } from "./pages/stocks/StockDetailPage";
import { MembersPage } from "./pages/members/MembersPage";
import { MemberProfilePage } from "./pages/members/MemberProfilePage";
import { AlumniPage } from "./pages/alumni/AlumniPage";
import { ResourcesPage } from "./pages/resources/ResourcesPage";
import { PublicApplicationPage } from "./pages/public/PublicApplicationPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";
import { PendingApprovalPage } from "./pages/PendingApprovalPage";
import { RejectedPage } from "./pages/RejectedPage";
import { MemberApprovalsPage } from "./pages/admin/MemberApprovalsPage";
import { MemberManagementPage } from "./pages/admin/MemberManagementPage";
import { AttendancePage } from "./pages/admin/attendance/AttendancePage";
import { AlumniRegisterPage } from "./pages/AlumniRegisterPage";
import { AlumniSetupPage } from "./pages/AlumniSetupPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: "/apply",
    element: <PublicLayout />,
    children: [{ index: true, element: <PublicApplicationPage /> }],
  },
  { path: "/setup", element: <ProfileSetupPage /> },
  { path: "/alumni-register", element: <AlumniRegisterPage /> },
  { path: "/alumni-setup", element: <AlumniSetupPage /> },
  { path: "/pending", element: <PendingApprovalPage /> },
  { path: "/rejected", element: <RejectedPage /> },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <RequireAccess check="member"><CalendarPage /></RequireAccess> },
      { path: "calendar", element: <RequireAccess check="member"><CalendarPage /></RequireAccess> },
      { path: "members", element: <MembersPage /> },
      { path: "members/:userId", element: <MemberProfilePage /> },
      { path: "stocks", element: <RequireAccess check="member"><StocksPage /></RequireAccess> },
      { path: "stocks/my-theses", element: <RequireAccess check="member"><MyThesesPage /></RequireAccess> },
      { path: "stocks/:ticker", element: <RequireAccess check="member"><StockDetailPage /></RequireAccess> },
      { path: "admin/approvals", element: <RequireAccess check="admin"><MemberApprovalsPage /></RequireAccess> },
      { path: "admin/members", element: <RequireAccess check="admin"><MemberManagementPage /></RequireAccess> },
      { path: "admin/attendance", element: <RequireAccess check="attendance"><AttendancePage /></RequireAccess> },
      { path: "alumni", element: <AlumniPage /> },
      { path: "resources", element: <RequireAccess check="member"><ResourcesPage /></RequireAccess> },
    ],
  },
]);
