import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { ResourceCard } from "./components/ResourceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function InterviewPrepPage() {
  const resources = useQuery(api.resources.list);
  const deleteResource = useMutation(api.resources.deleteResource);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const uploadInterviewPrep = useMutation(api.resources.uploadInterviewPrep);
  const { hasAdminAccess } = useCurrentProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");

  const filtered = resources?.filter((r) => r.category === "interview_prep") ?? [];

  const handleDelete = async (resourceId: Id<"resources">) => {
    try {
      await deleteResource({ resourceId });
      toast.success("Resource deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete resource");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const result = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      await uploadInterviewPrep({
        title: uploadTitle.trim() || file.name.replace(/\.pdf$/i, ""),
        fileStorageId: storageId as Id<"_storage">,
      });

      toast.success("Interview prep resource uploaded");
      setUploadTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Prep</h1>
          <p className="text-muted-foreground">
            Resources to help prepare for interviews.
          </p>
        </div>
        {hasAdminAccess && (
          <div className="flex items-center gap-2">
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Resource title..."
              className="w-48 h-9 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload PDF"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => void handleUpload(e)}
            />
          </div>
        )}
      </div>

      {resources === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No interview prep resources uploaded yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard
              key={resource._id}
              resource={resource}
              showDelete={hasAdminAccess}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
