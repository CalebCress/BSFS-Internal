import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, Upload, X, FileText, Info } from "lucide-react";
import {
  EMPTY_DRAFT,
  clearDraft,
  clearSubmission,
  draftHasContent,
  loadDraft,
  loadSubmission,
  saveDraft,
  saveSubmission,
} from "./applyDraft";

const applicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
  aboutYou: z.string().min(50, "Please write at least 50 characters"),
  marketsInsight: z.string().min(50, "Please write at least 50 characters"),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export function PublicApplicationPage() {
  const activeForm = useQuery(api.applicationForms.getActive);
  const submitApplication = useMutation(api.applications.submit);
  const generateUploadUrl = useMutation(api.applications.generateUploadUrl);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read once, before the form exists, so the saved answers become the initial
  // values rather than being written in afterwards.
  const [restoredDraft] = useState(loadDraft);
  const [restoredSubmission, setRestoredSubmission] = useState(loadSubmission);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: restoredDraft?.values ?? EMPTY_DRAFT,
  });

  // NOTE: these effects must stay ABOVE the loading/closed/submitted early
  // returns below - a hook after a conditional return changes hook order
  // between renders and React will throw.

  // Persist as they type, debounced so we aren't hitting storage per keystroke.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = form.watch((values) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        saveDraft(values as Partial<typeof EMPTY_DRAFT>, activeForm?._id ?? null);
      }, 400);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [form, activeForm?._id]);

  // A draft written for a previous round shouldn't resurface in a new one.
  useEffect(() => {
    if (!activeForm || !restoredDraft?.formId) return;
    if (restoredDraft.formId !== activeForm._id) {
      clearDraft();
      form.reset(EMPTY_DRAFT);
    }
  }, [activeForm, restoredDraft, form]);

  // Likewise a receipt from a previous round: having applied last semester
  // must not lock someone out of applying this one.
  useEffect(() => {
    if (!activeForm || !restoredSubmission) return;
    if (restoredSubmission.formId !== activeForm._id) {
      clearSubmission();
      setRestoredSubmission(null);
    }
  }, [activeForm, restoredSubmission]);

  const restoredFromDraft =
    !!restoredDraft && draftHasContent(restoredDraft.values);

  // Loading state
  if (activeForm === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  // Closed state
  if (activeForm === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Applications Closed</CardTitle>
            <CardDescription>
              We are not currently accepting applications. Please check back
              later for future recruitment rounds.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state - shown straight after submitting, and again for a month
  // afterwards from the receipt saved on this device.
  const remembered =
    restoredSubmission?.formId === activeForm._id ? restoredSubmission : null;

  if (submitted || remembered) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Thank you for applying!</h2>
            <p className="mt-2 text-muted-foreground">
              Your application for the {activeForm.semester} round has been
              submitted successfully. We will be in touch via email.
            </p>
            {remembered && !submitted && (
              <p className="mt-4 text-sm text-muted-foreground">
                Submitted on{" "}
                {new Date(remembered.submittedAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {remembered.email ? ` as ${remembered.email}` : ""}.
              </p>
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-2 text-muted-foreground"
              onClick={() => {
                clearSubmission();
                clearDraft();
                setRestoredSubmission(null);
                setSubmitted(false);
                form.reset(EMPTY_DRAFT);
              }}
            >
              Not you? Start a new application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: ApplicationFormData) => {
    setSubmitting(true);
    try {
      // Step 1: Upload CV if provided
      let cvStorageId: Id<"_storage"> | undefined;
      if (cvFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": cvFile.type },
          body: cvFile,
        });
        if (!result.ok) throw new Error("Failed to upload CV");
        const json = await result.json();
        cvStorageId = json.storageId as Id<"_storage">;
      }

      // Step 2: Submit application
      await submitApplication({
        applicationFormId: activeForm._id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        aboutYou: data.aboutYou,
        marketsInsight: data.marketsInsight,
        cvStorageId,
      });

      // Only on success - a failed submit must keep their answers.
      clearDraft();
      saveSubmission(data.email, activeForm._id);
      setSubmitted(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      setCvFile(file);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apply to BSFS</h1>
        <p className="text-muted-foreground">
          {activeForm.semester} Application Round
        </p>
      </div>

      {restoredFromDraft && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            We restored the answers you saved on this device. Your CV
            can&apos;t be saved automatically, so please re-attach it before
            submitting.
          </p>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-8"
        >
          {/* Section 1: Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+49 123 456 7890"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 2: CV Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Resume / CV</CardTitle>
              <CardDescription>
                Upload your resume or CV (PDF or Word, max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cvFile ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{cvFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(cvFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 transition-colors hover:border-primary hover:bg-muted/50"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      fileInputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground">
                    PDF or Word document, max 5MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </CardContent>
          </Card>

          {/* Section 3: Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Application Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="aboutYou"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tell me about yourself and why you would be a good fit for
                      BSFS.
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your answer here..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
              <FormField
                control={form.control}
                name="marketsInsight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tell me about an interesting thing you&apos;ve seen in the
                      markets or in corporate finance (M&amp;A, Capital Markets,
                      and PE Deals).
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your answer here..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
