import { Authenticated, Unauthenticated } from "convex/react";
import { Navigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XCircle, LogOut, Loader2 } from "lucide-react";
import { Toaster } from "sonner";

function RejectedContent() {
  const { signOut } = useAuthActions();
  const { profile, isLoading } = useCurrentProfile();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No profile — go to setup
  if (!profile) {
    return <Navigate to="/setup" replace />;
  }

  // Approved — go to app
  if (profile.status === "approved") {
    return <Navigate to="/" replace />;
  }

  // Pending — go to pending page
  if (profile.status === "pending") {
    return <Navigate to="/pending" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Application Not Approved</CardTitle>
          <CardDescription className="text-base">
            Unfortunately, your membership application was not approved. If you
            believe this is an error, please contact a board member directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => void signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

export function RejectedPage() {
  return (
    <>
      <Authenticated>
        <RejectedContent />
      </Authenticated>
      <Unauthenticated>
        <Navigate to="/login" replace />
      </Unauthenticated>
    </>
  );
}
