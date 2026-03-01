import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: string;
  profile: {
    displayName: string;
    linkedIn?: string;
    photoStorageId?: Id<"_storage">;
    cvStorageId?: Id<"_storage">;
    photoUrl?: string | null;
    cvUrl?: string | null;
    jobTitle?: string;
    company?: string;
  };
}

export function EditProfileDialog({
  open,
  onOpenChange,
  role,
  profile,
}: EditProfileDialogProps) {
  const updateProfile = useMutation(api.profiles.updateProfile);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);

  const [submitting, setSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [linkedIn, setLinkedIn] = useState(profile.linkedIn ?? "");
  const [photoStorageId, setPhotoStorageId] = useState<
    Id<"_storage"> | undefined
  >(profile.photoStorageId);
  const [cvStorageId, setCvStorageId] = useState<Id<"_storage"> | undefined>(
    profile.cvStorageId
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    profile.photoUrl ?? null
  );
  const [cvFileName, setCvFileName] = useState<string | null>(
    profile.cvStorageId ? "Current CV" : null
  );

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName);
      setJobTitle(profile.jobTitle ?? "");
      setCompany(profile.company ?? "");
      setLinkedIn(profile.linkedIn ?? "");
      setPhotoStorageId(profile.photoStorageId);
      setCvStorageId(profile.cvStorageId);
      setPhotoPreview(profile.photoUrl ?? null);
      setCvFileName(profile.cvStorageId ? "Current CV" : null);
    }
  }, [open, profile]);

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const url = await generateUploadUrl();
    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    return storageId as Id<"_storage">;
  };

  const handlePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const id = await uploadFile(file);
      setPhotoStorageId(id);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
      setPhotoPreview(profile.photoUrl ?? null);
    }
  };

  const handleCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const id = await uploadFile(file);
      setCvStorageId(id);
      setCvFileName(file.name);
      toast.success("CV uploaded");
    } catch {
      toast.error("Failed to upload CV");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    setSubmitting(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        linkedIn: linkedIn.trim() || undefined,
        photoStorageId,
        cvStorageId,
        jobTitle: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
      });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information visible to other members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Photo */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {photoPreview && (
                  <AvatarImage src={photoPreview} alt="Preview" />
                )}
                <AvatarFallback className="text-lg">
                  {displayName
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Upload Photo
                </Button>
                {photoStorageId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhotoStorageId(undefined);
                      setPhotoPreview(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handlePhotoChange(e)}
              />
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          {/* Job Title & Company (alumni) */}
          {role === "alumni" && (
            <>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Investment Analyst"
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Goldman Sachs"
                />
              </div>
            </>
          )}

          {/* LinkedIn */}
          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input
              type="url"
              value={linkedIn}
              onChange={(e) => setLinkedIn(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          {/* CV */}
          <div className="space-y-2">
            <Label>CV (PDF)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cvInputRef.current?.click()}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                {cvFileName ?? "Upload CV"}
              </Button>
              {cvStorageId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCvStorageId(undefined);
                    setCvFileName(null);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              {cvFileName && (
                <span className="text-sm text-muted-foreground">
                  {cvFileName}
                </span>
              )}
              <input
                ref={cvInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => void handleCvChange(e)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
