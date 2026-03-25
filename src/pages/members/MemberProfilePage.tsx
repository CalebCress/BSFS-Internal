import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { RatingBadge } from "../stocks/components/RatingBadge";
import { EditProfileDialog } from "./components/EditProfileDialog";
import {
  ArrowLeft,
  Mail,
  Linkedin,
  FileDown,
  Pencil,
} from "lucide-react";
import { ROLES, SENTIMENT, type Role, type Sentiment } from "@/lib/constants";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile: myProfile } = useCurrentProfile();
  const [editOpen, setEditOpen] = useState(false);

  const profile = useQuery(
    api.profiles.getProfileByUserId,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const theses = useQuery(
    api.memberTheses.getThesesByUserId,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const isOwnProfile = myProfile?.userId === userId;

  if (profile === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/members")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Members
        </Button>
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Member not found.
        </div>
      </div>
    );
  }

  const roleConfig = ROLES[profile.role as Role];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/members")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Members
      </Button>

      {/* Profile Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            {profile.photoUrl && (
              <AvatarImage
                src={profile.photoUrl}
                alt={profile.displayName}
              />
            )}
            <AvatarFallback className="text-2xl">
              {getInitials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {profile.displayName}
              </h1>
              {roleConfig && (
                <Badge variant="secondary">{roleConfig.label}</Badge>
              )}
            </div>

            {/* Job title & company */}
            {(profile.jobTitle || profile.company) && (
              <p className="text-muted-foreground mt-1">
                {[profile.jobTitle, profile.company]
                  .filter(Boolean)
                  .join(" at ")}
              </p>
            )}

            {/* Contact info */}
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </a>
              )}
              {profile.linkedIn && (
                <a
                  href={profile.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {profile.cvUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={profile.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download CV
              </a>
            </Button>
          )}
          {isOwnProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Stock Theses Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Stock Theses{" "}
          {theses && theses.length > 0 && (
            <span className="text-muted-foreground font-normal">
              ({theses.length})
            </span>
          )}
        </h2>

        {theses === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : theses.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No stock theses yet.
          </div>
        ) : (
          <div className="space-y-3">
            {theses.map((thesis) => {
              const sentimentConfig =
                SENTIMENT[thesis.sentiment as Sentiment] ??
                SENTIMENT.neutral;
              return (
                <div
                  key={thesis._id}
                  className="rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() =>
                    thesis.stock &&
                    navigate(`/stocks/${thesis.stock.ticker}`)
                  }
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {thesis.stock && (
                        <span className="font-semibold">
                          {thesis.stock.ticker}
                        </span>
                      )}
                      {thesis.stock?.name && (
                        <span className="text-sm text-muted-foreground">
                          {thesis.stock.name}
                        </span>
                      )}
                      <RatingBadge rating={thesis.rating} size="sm" />
                      <Badge
                        variant="secondary"
                        className={sentimentConfig.color}
                      >
                        {sentimentConfig.label}
                      </Badge>
                      {thesis.priceTarget !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          PT: ${thesis.priceTarget.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(thesis.updatedAt)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap line-clamp-3">
                    {thesis.thesis}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Profile Dialog */}
      {isOwnProfile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          role={profile.role}
          profile={{
            displayName: profile.displayName,
            linkedIn: profile.linkedIn,
            photoStorageId: profile.photoStorageId,
            cvStorageId: profile.cvStorageId,
            photoUrl: profile.photoUrl,
            cvUrl: profile.cvUrl,
            jobTitle: profile.jobTitle,
            company: profile.company,
          }}
        />
      )}
    </div>
  );
}
