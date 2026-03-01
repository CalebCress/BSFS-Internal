import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Toaster } from "sonner";
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

function AlumniRegisterForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);

  // Set alumni flag so ApprovedGate routes to /alumni-setup instead of /setup
  useEffect(() => {
    localStorage.setItem("bsfs_alumni_signup", "1");
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    formData.set("flow", "signUp");
    signIn("password", formData)
      .catch((error) => {
        console.error(error);
        toast.error("Could not create account. Try again.");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">BSFS Alumni Registration</CardTitle>
          <CardDescription>
            Create an account to join the BSFS alumni network.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {submitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="underline hover:text-foreground">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

export function AlumniRegisterPage() {
  return (
    <>
      <Authenticated>
        <Navigate to="/alumni-setup" replace />
      </Authenticated>
      <Unauthenticated>
        <AlumniRegisterForm />
      </Unauthenticated>
    </>
  );
}
