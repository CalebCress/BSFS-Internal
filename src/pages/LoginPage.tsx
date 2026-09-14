import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
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

export function LoginPage() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp" | "forgot">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const handlePasswordAuth = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    formData.set("flow", flow);
    signIn("password", formData)
      .catch((error) => {
        console.error(error);
        toast.error(
          flow === "signIn"
            ? "Could not sign in. Check your credentials."
            : "Could not create account. Try again."
        );
      })
      .finally(() => setSubmitting(false));
  };

  const handleForgotPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    formData.set("flow", "reset");
    signIn("password", formData)
      // Whether or not the address has an account, show the same message so
      // the form can't be used to check which emails are registered.
      .catch((error) => console.error(error))
      .finally(() => {
        setResetSentTo(email);
        setSubmitting(false);
      });
  };

  if (flow === "forgot") {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>
            {resetSentTo
              ? "Check your inbox"
              : "Enter your email and we'll send you a link to choose a new password"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resetSentTo ? (
            <p className="text-center text-sm text-muted-foreground">
              If an account exists for <strong>{resetSentTo}</strong>, we've
              sent a password reset link. The link expires in an hour. If you
              don't see it, check your spam folder.
            </p>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => {
                setResetSentTo(null);
                setFlow("signIn");
              }}
            >
              Back to sign in
            </button>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">BSFS Internal</CardTitle>
        <CardDescription>
          {flow === "signIn"
            ? "Sign in to your account"
            : "Create a new account"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handlePasswordAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {flow === "signIn" && (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline hover:text-foreground"
                  onClick={() => setFlow("forgot")}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Loading..."
              : flow === "signIn"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {flow === "signIn" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={() => setFlow("signUp")}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={() => setFlow("signIn")}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Are you an alumni?{" "}
          <a href="/alumni-register" className="underline hover:text-foreground">
            Register here
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
