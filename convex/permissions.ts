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

/**
 * May this person conduct telephone interviews - sign up for the slots, see
 * the schedule, review the applicants they take?
 *
 * The telephone round is the board's by default, but the TI Reviewer special
 * role opens it to one more person without giving them a board seat. It is
 * granted per person, so alumni can hold it too.
 */
export function canConductTelephoneInterviews(profile: {
  role: string;
  specialRole?: string;
  status?: string;
}): boolean {
  if (profile.status !== undefined && profile.status !== "approved") {
    return false;
  }
  return isBoardMember(profile) || profile.specialRole === "ti_reviewer";
}

/**
 * Holds the Admin special role specifically.
 *
 * Deliberately NOT hasAdminAccess, which also admits every board member. Some
 * things are for the person administering the society rather than for the
 * board as a whole - reviewer statistics, say, where the board are the subject
 * rather than the audience.
 */
export function isAdminSpecialRole(profile: {
  specialRole?: string;
  status?: string;
}): boolean {
  if (profile.status !== undefined && profile.status !== "approved") {
    return false;
  }
  return profile.specialRole === "admin";
}
