import { Authenticated } from "convex/react";
import { Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export function AuthLayout() {
  return (
    <>
      <Authenticated>
        <Navigate to="/" replace />
      </Authenticated>
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md px-4">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </>
  );
}
