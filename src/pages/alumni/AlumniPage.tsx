import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Briefcase, Building2, Linkedin } from "lucide-react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AlumniPage() {
  const alumni = useQuery(api.profiles.listAlumni);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = (alumni ?? []).filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.displayName.toLowerCase().includes(q) ||
      (a.jobTitle?.toLowerCase().includes(q) ?? false) ||
      (a.company?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alumni Network</h1>
        <p className="text-muted-foreground mt-1">
          Connect with BSFS alumni across the industry.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search alumni..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Count */}
      {alumni && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} alumni member{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Alumni Grid */}
      {alumni === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {search ? "No alumni match your search." : "No alumni found."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <div
              key={member._id}
              className="flex flex-col items-center gap-3 rounded-lg border p-5 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/members/${member.userId}`)}
            >
              <Avatar className="h-16 w-16">
                {member.photoUrl && (
                  <AvatarImage
                    src={member.photoUrl}
                    alt={member.displayName}
                  />
                )}
                <AvatarFallback className="text-lg">
                  {getInitials(member.displayName)}
                </AvatarFallback>
              </Avatar>

              <div className="text-center min-w-0 w-full">
                <h3 className="font-semibold truncate">
                  {member.displayName}
                </h3>

                {member.jobTitle && (
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
                    <Briefcase className="h-3 w-3 shrink-0" />
                    <span className="truncate">{member.jobTitle}</span>
                  </div>
                )}

                {member.company && (
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{member.company}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Alumni</Badge>
                {member.linkedIn && (
                  <a
                    href={member.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
