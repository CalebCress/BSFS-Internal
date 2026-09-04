import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Catch-all for unknown URLs.
 *
 * Deliberately says nothing about whether a page exists but is out of reach -
 * this is also what an applicant sees if they mistype a booking link, and it
 * shouldn't hint at what else is here.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-5xl font-bold tracking-tight text-bsfs-blue">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/">Go home</Link>
        </Button>
        <Button asChild>
          <Link to="/apply">Apply to BSFS</Link>
        </Button>
      </div>
    </div>
  );
}
