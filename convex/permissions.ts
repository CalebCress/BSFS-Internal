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
