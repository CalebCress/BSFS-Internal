import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { ResourceCard } from "./components/ResourceCard";
import { toast } from "sonner";

export function WorkshopsPage() {
  const resources = useQuery(api.resources.list);
  const deleteResource = useMutation(api.resources.deleteResource);
  const { hasAdminAccess } = useCurrentProfile();

  const filtered = resources?.filter((r) => r.category === "workshop") ?? [];

  const handleDelete = async (resourceId: Id<"resources">) => {
    try {
      await deleteResource({ resourceId });
      toast.success("Resource deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete resource");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workshops</h1>
        <p className="text-muted-foreground">
          Materials from workshop sessions.
        </p>
      </div>

      {resources === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No workshop resources uploaded yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard
              key={resource._id}
              resource={resource}
              showDelete={hasAdminAccess}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
