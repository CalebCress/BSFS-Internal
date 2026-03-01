import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCurrentProfile() {
  const profile = useQuery(api.profiles.getMyProfile);

  return {
    profile,
    isBoardMember: profile?.role === "board_member",
    isCommitteeMember: profile?.role === "committee_member",
    isAlumni: profile?.role === "alumni",
    isPending: profile?.status === "pending",
    isApproved: profile?.status === "approved",
    isRejected: profile?.status === "rejected",
    hasProfile: profile !== null && profile !== undefined,
    isLoading: profile === undefined,
  };
}
