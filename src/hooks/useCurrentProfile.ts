import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCurrentProfile() {
  const profile = useQuery(api.profiles.getMyProfile);

  const isBoardMember = profile?.role === "board_member";
  const hasAdminAccess = isBoardMember || profile?.specialRole === "admin";
  const canRecordAttendance =
    hasAdminAccess || profile?.specialRole === "attendance_tracker";
  const isCvReviewer = profile?.specialRole === "cv_reviewer";
  // The Admin special role specifically - NOT hasAdminAccess, which every
  // board member passes. Mirrors isAdminSpecialRole in convex/permissions.
  const isAdminSpecialRole =
    profile?.status === "approved" && profile?.specialRole === "admin";
  // Conducts telephone interviews: the board, plus anyone holding the TI
  // Reviewer role. Mirrors canConductTelephoneInterviews in convex/permissions.
  const canConductTelephoneInterviews =
    profile?.status === "approved" &&
    (isBoardMember || profile?.specialRole === "ti_reviewer");

  return {
    profile,
    isBoardMember,
    hasAdminAccess,
    canRecordAttendance,
    isCvReviewer,
    isAdminSpecialRole,
    canConductTelephoneInterviews,
    isCommitteeMember: profile?.role === "committee_member",
    isAlumni: profile?.role === "alumni",
    isPending: profile?.status === "pending",
    isApproved: profile?.status === "approved",
    isRejected: profile?.status === "rejected",
    hasProfile: profile !== null && profile !== undefined,
    isLoading: profile === undefined,
  };
}
