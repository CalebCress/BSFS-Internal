import { Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-lg font-semibold">BSFS</h1>
        </div>
      </header>
      <main className="container flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
