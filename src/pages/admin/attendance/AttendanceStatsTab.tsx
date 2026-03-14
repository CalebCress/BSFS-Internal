import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { ROLES } from "@/lib/constants";

type SortKey = "present" | "absent" | "excused" | "rate";
type SortDir = "asc" | "desc";

export function AttendanceStatsTab() {
  const stats = useQuery(api.attendance.getMemberStats);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = (stats ?? []).filter((s) => {
    if (!search.trim()) return true;
    return s.displayName.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let aVal: number;
    let bVal: number;
    if (sortKey === "rate") {
      aVal = a.attendanceRate ?? -1;
      bVal = b.attendanceRate ?? -1;
    } else {
      aVal = a[sortKey];
      bVal = b[sortKey];
    }
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  // Overall stats
  const totalPresent = filtered.reduce((sum, s) => sum + s.present, 0);
  const totalAbsent = filtered.reduce((sum, s) => sum + s.absent, 0);
  const totalExcused = filtered.reduce((sum, s) => sum + s.excused, 0);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return null;
    return sortDir === "desc" ? (
      <ArrowDown className="inline h-3 w-3 ml-0.5" />
    ) : (
      <ArrowUp className="inline h-3 w-3 ml-0.5" />
    );
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Summary cards */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
            <p className="text-xs text-muted-foreground">Total Present</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
            <p className="text-xs text-muted-foreground">Total Absent</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {totalExcused}
            </p>
            <p className="text-xs text-muted-foreground">Total Excused</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Members table */}
      {stats === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {search ? "No members match your search." : "No attendance data yet."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Member</span>
            <button
              className={`text-center w-16 cursor-pointer hover:text-foreground transition-colors ${sortKey === "present" ? "text-foreground" : ""}`}
              onClick={() => handleSort("present")}
            >
              Present
              <SortIcon column="present" />
            </button>
            <button
              className={`text-center w-16 cursor-pointer hover:text-foreground transition-colors ${sortKey === "absent" ? "text-foreground" : ""}`}
              onClick={() => handleSort("absent")}
            >
              Absent
              <SortIcon column="absent" />
            </button>
            <button
              className={`text-center w-16 cursor-pointer hover:text-foreground transition-colors ${sortKey === "excused" ? "text-foreground" : ""}`}
              onClick={() => handleSort("excused")}
            >
              Excused
              <SortIcon column="excused" />
            </button>
            <span className="text-center w-20">Recorded</span>
            <button
              className={`text-right w-16 cursor-pointer hover:text-foreground transition-colors ${sortKey === "rate" ? "text-foreground" : ""}`}
              onClick={() => handleSort("rate")}
            >
              Rate
              <SortIcon column="rate" />
            </button>
          </div>
          {sorted.map((member) => (
            <div
              key={member.userId}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 border-b last:border-b-0 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {member.displayName}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {ROLES[member.role as keyof typeof ROLES]?.label ??
                      member.role}
                  </Badge>
                </div>
              </div>

              <span className="text-center text-sm font-medium text-green-600 w-16">
                {member.present}
              </span>
              <span className="text-center text-sm font-medium text-red-600 w-16">
                {member.absent}
              </span>
              <span className="text-center text-sm font-medium text-yellow-600 w-16">
                {member.excused}
              </span>
              <span className="text-center text-sm text-muted-foreground w-20">
                {member.totalRecorded}/{member.totalEvents}
              </span>

              {/* Attendance rate */}
              <div className="text-right w-16">
                {member.attendanceRate !== null ? (
                  <Badge
                    variant={
                      member.attendanceRate >= 75
                        ? "default"
                        : member.attendanceRate >= 50
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {member.attendanceRate}%
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
