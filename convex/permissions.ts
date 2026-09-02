export function hasAdminAccess(profile: {
  role: string;
  specialRole?: string;
}): boolean {
  return profile.role === "board_member" || profile.specialRole === "admin";
}

export function hasAttendanceAccess(profile: {
  role: string;
  specialRole?: string;
}): boolean {
  return hasAdminAccess(profile) || profile.specialRole === "attendance_tracker";
}

export function hasCvReviewerAccess(profile: {
  role: string;
  specialRole?: string;
}): boolean {
  return profile.specialRole === "cv_reviewer";
}

/**
 * Strictly a board member. Distinct from hasAdminAccess, which also admits the
 * `admin` special role - the review restrictions are about the board seat.
 */
export function isBoardMember(profile: { role: string }): boolean {
  return profile.role === "board_member";
}
