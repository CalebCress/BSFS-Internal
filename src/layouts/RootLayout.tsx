import { Authenticated, Unauthenticated } from "convex/react";
import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "sonner";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Loader2 } from "lucide-react";

function ApprovedGate({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useCurrentProfile();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No profile yet — redirect to profile setup
  if (!profile) {
    const isAlumniSignUp = localStorage.getItem("bsfs_alumni_signup") === "1";
    return <Navigate to={isAlumniSignUp ? "/alumni-setup" : "/setup"} replace />;
  }

  // Pending approval
  if (profile.status === "pending") {
    return <Navigate to="/pending" replace />;
  }

  // Rejected
  if (profile.status === "rejected") {
    return <Navigate to="/rejected" replace />;
  }

  // Approved — render the app
  return <>{children}</>;
}

export function RootLayout() {
  return (
    <>
      <Authenticated>
        <ApprovedGate>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="flex-1 overflow-auto p-6">
                <Outlet />
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ApprovedGate>
      </Authenticated>
      <Unauthenticated>
        <Navigate to="/login" replace />
      </Unauthenticated>
    </>
  );
}
