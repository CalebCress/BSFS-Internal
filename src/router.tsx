import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ApplicationsOverviewPage } from "./pages/applications/ApplicationsOverviewPage";
import { FormsPage } from "./pages/applications/FormsPage";
import { ApplicantsPage } from "./pages/applications/ApplicantsPage";
import { ApplicantDetailPage } from "./pages/applications/ApplicantDetailPage";
import { InterviewsPage } from "./pages/applications/InterviewsPage";
import { ReviewsPage } from "./pages/applications/ReviewsPage";
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
      { index: true, element: <CalendarPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "members", element: <MembersPage /> },
      { path: "members/:userId", element: <MemberProfilePage /> },
      { path: "stocks", element: <StocksPage /> },
      { path: "stocks/my-theses", element: <MyThesesPage /> },
      { path: "stocks/:ticker", element: <StockDetailPage /> },
      { path: "admin/approvals", element: <MemberApprovalsPage /> },
      { path: "admin/members", element: <MemberManagementPage /> },
      { path: "alumni", element: <AlumniPage /> },
      { path: "resources", element: <ResourcesPage /> },
    ],
  },
]);
