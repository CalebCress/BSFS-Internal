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
import { Clock, LogOut, Loader2 } from "lucide-react";
import { Toaster } from "sonner";

function PendingContent() {
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
  if (profile === null) {
    return <Navigate to="/setup" replace />;
  }

  // Already approved — go to app
  if (profile.status === "approved") {
    return <Navigate to="/" replace />;
  }

  // Rejected — go to rejected page
  if (profile.status === "rejected") {
    return <Navigate to="/rejected" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Application Pending</CardTitle>
          <CardDescription className="text-base">
            Your membership request has been submitted and is awaiting approval
            from a board member. You will be able to access the app once
            approved.
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

export function PendingApprovalPage() {
  return (
    <>
      <Authenticated>
        <PendingContent />
      </Authenticated>
      <Unauthenticated>
        <Navigate to="/login" replace />
      </Unauthenticated>
    </>
  );
}
