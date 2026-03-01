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
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

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
            <Label htmlFor="password">Password</Label>
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
