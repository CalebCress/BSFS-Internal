import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCurrentProfile() {
  const profile = useQuery(api.profiles.getMyProfile);

  const isBoardMember = profile?.role === "board_member";
  const hasAdminAccess = isBoardMember || profile?.specialRole === "admin";
  const canRecordAttendance =
    hasAdminAccess || profile?.specialRole === "attendance_tracker";
  const isCvReviewer = profile?.specialRole === "cv_reviewer";
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
