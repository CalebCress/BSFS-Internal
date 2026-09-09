import { createBrowserRouter, Navigate } from "react-router-dom";
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
import { MarketCorporatePage } from "./pages/resources/MarketCorporatePage";
import { WorkshopsPage } from "./pages/resources/WorkshopsPage";
import { InterviewPrepPage } from "./pages/resources/InterviewPrepPage";
import { RegionalReportsPage } from "./pages/resources/RegionalReportsPage";
import { SpecialReportsPage } from "./pages/resources/SpecialReportsPage";
import { CvReviewPage } from "./pages/careers/CvReviewPage";
import { ReviewQueuePage } from "./pages/careers/ReviewQueuePage";
import { InternshipTrackerPage } from "./pages/careers/InternshipTrackerPage";
import { PublicApplicationPage } from "./pages/public/PublicApplicationPage";
import { PublicInterviewBookingPage } from "./pages/public/PublicInterviewBookingPage";
import { ApplicationsOverviewPage } from "./pages/applications/ApplicationsOverviewPage";
import { FormsPage } from "./pages/applications/FormsPage";
import { ApplicantsPage } from "./pages/applications/ApplicantsPage";
import { ApplicantDetailPage } from "./pages/applications/ApplicantDetailPage";
import { InterviewsPage } from "./pages/applications/InterviewsPage";
import { ReviewsPage } from "./pages/applications/ReviewsPage";
import { ReviewerStatsPage } from "./pages/applications/ReviewerStatsPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";
import { PendingApprovalPage } from "./pages/PendingApprovalPage";
import { RejectedPage } from "./pages/RejectedPage";
import { MemberApprovalsPage } from "./pages/admin/MemberApprovalsPage";
import { MemberManagementPage } from "./pages/admin/MemberManagementPage";
import { AttendancePage } from "./pages/admin/attendance/AttendancePage";
import { AlumniRegisterPage } from "./pages/AlumniRegisterPage";
import { AlumniSetupPage } from "./pages/AlumniSetupPage";
import { NotFoundPage } from "./pages/NotFoundPage";

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
  // Short links for posters and Instagram bios. `replace` so the back button
  // returns to wherever they came from, not to the redirect.
  { path: "/y", element: <Navigate to="/apply" replace /> },
  { path: "/ly", element: <Navigate to="/apply" replace /> },
  {
    path: "/interview/:token",
    element: <PublicLayout />,
    children: [{ index: true, element: <PublicInterviewBookingPage /> }],
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
      { path: "applications", element: <RequireAccess check="board"><ApplicationsOverviewPage /></RequireAccess> },
      { path: "applications/forms", element: <RequireAccess check="board"><FormsPage /></RequireAccess> },
      { path: "applications/applicants", element: <RequireAccess check="applications"><ApplicantsPage /></RequireAccess> },
      { path: "applications/applicants/:id", element: <RequireAccess check="applications"><ApplicantDetailPage /></RequireAccess> },
      { path: "applications/interviews", element: <RequireAccess check="applications"><InterviewsPage /></RequireAccess> },
      { path: "applications/reviews", element: <RequireAccess check="applications"><ReviewsPage /></RequireAccess> },
      { path: "applications/reviewer-stats", element: <RequireAccess check="admin_special"><ReviewerStatsPage /></RequireAccess> },
      { path: "members", element: <MembersPage /> },
      { path: "members/:userId", element: <MemberProfilePage /> },
      { path: "stocks", element: <RequireAccess check="member"><StocksPage /></RequireAccess> },
      { path: "stocks/my-theses", element: <RequireAccess check="member"><MyThesesPage /></RequireAccess> },
      { path: "stocks/:ticker", element: <RequireAccess check="member"><StockDetailPage /></RequireAccess> },
      { path: "admin/approvals", element: <RequireAccess check="admin"><MemberApprovalsPage /></RequireAccess> },
      { path: "admin/members", element: <RequireAccess check="admin"><MemberManagementPage /></RequireAccess> },
      { path: "admin/attendance", element: <RequireAccess check="attendance"><AttendancePage /></RequireAccess> },
      { path: "alumni", element: <AlumniPage /> },
      { path: "resources/market-corporate", element: <MarketCorporatePage /> },
      { path: "resources/workshops", element: <WorkshopsPage /> },
      { path: "resources/regional-reports", element: <RegionalReportsPage /> },
      { path: "resources/special-reports", element: <SpecialReportsPage /> },
      { path: "resources/interview-prep", element: <InterviewPrepPage /> },
      { path: "careers/cv-review", element: <RequireAccess check="member"><CvReviewPage /></RequireAccess> },
      { path: "careers/review-queue", element: <RequireAccess check="cv_reviewer"><ReviewQueuePage /></RequireAccess> },
      { path: "careers/internship-tracker", element: <RequireAccess check="member"><InternshipTrackerPage /></RequireAccess> },
    ],
  },
  // Anything else. Outside RootLayout so an unknown URL never runs the
  // authenticated shell - a stranger following a bad link gets the 404, not a
  // redirect to the login page.
  { path: "*", element: <NotFoundPage /> },
]);
