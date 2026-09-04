import { Outlet } from "react-router-dom";

/**
 * Society logo, served from the public website's CDN.
 *
 * Hosted rather than bundled, so it is one external dependency on a page
 * applicants see: if that CDN ever drops the file, the header falls back to the
 * alt text rather than breaking the form. Worth vendoring into /public if this
 * page matters more later.
 */
const LOGO_URL =
  "https://storage.e.jimdo.com/cdn-cgi/image/quality=85,fit=scale-down,format=auto,trim=0;0;0;0,width=480,height=478/image/258753997/8c44d2f5-6ec4-4293-a409-684307fcfaf1.png";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-t-2 border-t-bsfs-blue bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center px-4">
          {/* Alt text, not a decorative image: it is the only thing naming the
              society in this header. */}
          <img
            src={LOGO_URL}
            alt="BSFS"
            width={480}
            height={478}
            className="h-10 w-auto"
          />
        </div>
      </header>
      <main className="container flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
