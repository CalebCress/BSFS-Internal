import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";

export function ResourcesPage() {
  const resources = useQuery(api.resources.list);
  const navigate = useNavigate();


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="text-muted-foreground">
          Shared resources, documents, and links for BSFS members.
        </p>
      </div>

      {resources === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No resources uploaded yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource._id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {resource.title}
                    </p>
                    {resource.eventDate && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(resource.eventDate)}
                      </p>
                    )}
                  </div>
                  {resource.fileUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={resource.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                {(resource.corporatePresenterName || resource.marketPresenterName) && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    <span className="font-medium">From: </span>
                    {resource.corporatePresenterName && resource.corporatePresenter && (
                      <button
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                        onClick={() =>
                          navigate(`/members/${resource.corporatePresenter}`)
                        }
                      >
                        {resource.corporatePresenterName}
                      </button>
                    )}
                    {resource.corporatePresenterName && resource.marketPresenterName && (
                      <span> & </span>
                    )}
                    {resource.marketPresenterName && resource.marketPresenter && (
                      <button
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                        onClick={() =>
                          navigate(`/members/${resource.marketPresenter}`)
                        }
                      >
                        {resource.marketPresenterName}
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
