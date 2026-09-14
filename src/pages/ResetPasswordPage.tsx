import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
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

/**
 * Landing page for the link in the password reset email.
 *
 * The email and one-time code arrive as query params; the user only has to
 * type their new password. On success Convex Auth signs them in, and
 * AuthLayout redirects to the app.
 */
export function ResetPasswordPage() {
  const { signIn } = useAuthActions();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code") ?? "";

  if (!email || !code) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Invalid reset link</CardTitle>
          <CardDescription>
            This link is missing some information. Request a new one from the
            sign in page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="underline hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    signIn("password", {
      flow: "reset-verification",
      email,
      code,
      newPassword,
    })
      .catch((error) => {
        console.error(error);
        toast.error(
          "Could not reset your password. The link may have expired - request a new one from the sign in page."
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>for {email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Resetting..." : "Reset password"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="underline hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
