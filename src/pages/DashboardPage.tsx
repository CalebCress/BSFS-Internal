import { useCurrentProfile } from "@/hooks/useCurrentProfile";

export function DashboardPage() {
  const { profile } = useCurrentProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{profile?.displayName ? `, ${profile.displayName}` : ""}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StubCard title="Total Applicants" value="--" />
        <StubCard title="Pending Reviews" value="--" />
        <StubCard title="Upcoming Interviews" value="--" />
        <StubCard title="Active Applications" value="--" />
      </div>
    </div>
  );
}

function StubCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
