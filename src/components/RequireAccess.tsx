import { Navigate } from "react-router-dom";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

interface RequireAccessProps {
  check:
    | "admin"
    | "board"
    | "attendance"
    | "member"
    | "cv_reviewer"
    | "applications";
  children: React.ReactNode;
}

/**
 * Gate component that redirects to home when the current user
 * lacks the required access level. Shows nothing while loading.
 */
export function RequireAccess({ check, children }: RequireAccessProps) {
  const {
    hasAdminAccess,
    isBoardMember,
    canRecordAttendance,
    isCvReviewer,
    canConductTelephoneInterviews,
    isAlumni,
    isLoading,
  } = useCurrentProfile();

  if (isLoading) return null;

  let allowed = false;
  switch (check) {
    case "admin":
      allowed = hasAdminAccess;
      break;
    // Strictly the board seat, unlike "admin" which also admits the admin
    // special role.
    case "board":
      allowed = isBoardMember;
      break;
    case "attendance":
      allowed = canRecordAttendance;
      break;
    case "cv_reviewer":
      allowed = !!isCvReviewer;
      break;
    case "member":
      // "member" means non-alumni (committee_member or board_member)
      allowed = !isAlumni;
      break;
    // Like "member", but also admits an alumnus holding a special role that
    // needs these pages - a TI Reviewer has to reach the schedule they sign up
    // on and the applicants they take.
    case "applications":
      allowed = !isAlumni || canConductTelephoneInterviews;
      break;
  }

  if (!allowed) return <Navigate to="/" replace />;

  return <>{children}</>;
}
