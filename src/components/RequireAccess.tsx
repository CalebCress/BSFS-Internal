import { Navigate } from "react-router-dom";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

interface RequireAccessProps {
  check: "admin" | "attendance" | "member";
  children: React.ReactNode;
}

/**
 * Gate component that redirects to home when the current user
 * lacks the required access level. Shows nothing while loading.
 */
export function RequireAccess({ check, children }: RequireAccessProps) {
  const { hasAdminAccess, canRecordAttendance, isAlumni, isLoading } =
    useCurrentProfile();

  if (isLoading) return null;

  let allowed = false;
  switch (check) {
    case "admin":
      allowed = hasAdminAccess;
      break;
    case "attendance":
      allowed = canRecordAttendance;
      break;
    case "member":
      // "member" means non-alumni (committee_member or board_member)
      allowed = !isAlumni;
      break;
  }

  if (!allowed) return <Navigate to="/" replace />;

  return <>{children}</>;
}
