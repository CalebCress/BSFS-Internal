import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface PresentationUploadProps {
  eventId: Id<"events">;
}

export function PresentationUpload({ eventId }: PresentationUploadProps) {
  const resource = useQuery(api.resources.getByEvent, { eventId });
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const uploadPresentation = useMutation(api.resources.uploadPresentation);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      await uploadPresentation({
        eventId,
        fileStorageId: storageId as Id<"_storage">,
      });

      toast.success("Presentation uploaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload presentation"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (resource) {
    return (
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <a
          href={resource.fileUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          View Presentation
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Replace"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="mr-1.5 h-3 w-3" />
        {uploading ? "Uploading..." : "Upload Presentation"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />
    </div>
  );
}
