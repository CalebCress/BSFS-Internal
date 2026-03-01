import { useState, useRef } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { Navigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";

function AlumniSetupForm() {
  const { profile, isLoading } = useCurrentProfile();

  const submitAlumniSignUp = useMutation(api.profiles.submitAlumniSignUp);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);

  const [submitting, setSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [photoStorageId, setPhotoStorageId] = useState<Id<"_storage"> | undefined>();
  const [cvStorageId, setCvStorageId] = useState<Id<"_storage"> | undefined>();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Already has a profile — redirect based on status
  if (profile !== null) {
    localStorage.removeItem("bsfs_alumni_signup");
    if (profile.status === "pending") return <Navigate to="/pending" replace />;
    if (profile.status === "rejected") return <Navigate to="/rejected" replace />;
    return <Navigate to="/" replace />;
  }

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const id = await uploadFile(file);
      setPhotoStorageId(id);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
      setPhotoPreview(null);
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
      await submitAlumniSignUp({
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        linkedIn: linkedIn.trim() || undefined,
        photoStorageId,
        cvStorageId,
      });
      localStorage.removeItem("bsfs_alumni_signup");
      toast.success("Profile submitted for approval!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit profile"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Alumni Profile</CardTitle>
          <CardDescription>
            Fill out your profile to join the BSFS alumni network. A board
            member will review and approve your application.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    {initials || "?"}
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
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Investment Analyst"
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Goldman Sachs"
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn URL</Label>
              <Input
                id="linkedIn"
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
                  <>
                    <span className="text-sm text-muted-foreground">
                      {cvFileName}
                    </span>
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
                  </>
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
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

export function AlumniSetupPage() {
  return (
    <>
      <Authenticated>
        <AlumniSetupForm />
      </Authenticated>
      <Unauthenticated>
        <Navigate to="/login" replace />
      </Unauthenticated>
    </>
  );
}
