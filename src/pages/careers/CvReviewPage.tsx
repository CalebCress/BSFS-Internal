import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function CvReviewPage() {
  const { profile } = useCurrentProfile();
  const reviewers = useQuery(api.profiles.listCvReviewers);
  const myReviews = useQuery(api.cvReviews.listMy);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const submitReview = useMutation(api.cvReviews.submit);
  const updatePhoneNumber = useMutation(api.profiles.updatePhoneNumber);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<string>("anyone");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? "");
  const [phoneEditing, setPhoneEditing] = useState(false);

  // Sync phone number when profile loads
  const displayPhone = phoneEditing ? phoneNumber : (profile?.phoneNumber ?? "");

  const handleSubmitCv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    // Require phone number
    const currentPhone = profile?.phoneNumber;
    if (!currentPhone) {
      toast.error("Please save your phone number first");
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

      await submitReview({
        cvStorageId: storageId as Id<"_storage">,
        assignedTo:
          selectedReviewer === "anyone"
            ? undefined
            : (selectedReviewer as Id<"users">),
      });

      toast.success("CV submitted for review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit CV");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    try {
      await updatePhoneNumber({ phoneNumber: phoneNumber.trim() });
      toast.success("Phone number saved");
      setPhoneEditing(false);
    } catch (err) {
      toast.error("Failed to save phone number");
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CV Review</h1>
        <p className="text-muted-foreground">
          Submit your CV for review by a team member.
        </p>
      </div>

      {/* Submit CV Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Submit Your CV</h2>

          {/* Phone number */}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <p className="text-xs text-muted-foreground">
              So the reviewer can reach you with feedback.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={phoneEditing ? phoneNumber : displayPhone}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneEditing(true);
                }}
                placeholder="e.g. +44 7123 456789"
                className="w-64"
              />
              {(phoneEditing || !profile?.phoneNumber) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSavePhone()}
                >
                  Save
                </Button>
              )}
              {profile?.phoneNumber && !phoneEditing && (
                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                  Saved
                </Badge>
              )}
            </div>
          </div>

          {/* Reviewer selection */}
          <div className="space-y-2">
            <Label>Reviewer</Label>
            <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anyone">Anyone</SelectItem>
                {reviewers?.map((r) => (
                  <SelectItem key={r.userId} value={r.userId}>
                    {r.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload */}
          <div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !profile?.phoneNumber}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload CV (PDF)"}
            </Button>
            {!profile?.phoneNumber && (
              <p className="text-xs text-muted-foreground mt-1">
                Save your phone number before submitting.
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => void handleSubmitCv(e)}
            />
          </div>
        </CardContent>
      </Card>

      {/* My Submissions */}
      {myReviews && myReviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Submissions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myReviews.map((review) => (
              <Card key={review._id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium">
                        {formatDate(review.submittedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          review.status === "pending"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-green-50 text-green-700"
                        }
                      >
                        {review.status === "pending" ? "Pending" : "Completed"}
                      </Badge>
                      {review.cvUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={review.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reviewer: {review.assignedToName ?? "Anyone"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
