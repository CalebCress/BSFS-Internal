import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Search, Mail } from "lucide-react";
import { ROLES, type Role } from "@/lib/constants";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MembersPage() {
  const profiles = useQuery(api.profiles.listProfiles);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = (profiles ?? []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.displayName.toLowerCase().includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
      </div>

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

      {/* Members Grid */}
      {profiles === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {search ? "No members match your search." : "No members found."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => {
            const roleConfig = ROLES[member.role as Role];
            return (
              <div
                key={member._id}
                className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/members/${member.userId}`)}
              >
                <Avatar className="h-12 w-12">
                  {member.photoUrl && (
                    <AvatarImage
                      src={member.photoUrl}
                      alt={member.displayName}
                    />
                  )}
                  <AvatarFallback>
                    {getInitials(member.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {member.displayName}
                    </span>
                    {roleConfig && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {roleConfig.label}
                      </Badge>
                    )}
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
