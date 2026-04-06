import { useNavigate } from "react-router-dom";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Trash2 } from "lucide-react";

interface ResourceCardProps {
  resource: {
    _id: Id<"resources">;
    title: string;
    fileUrl: string | null;
    eventDate: string | null;
    corporatePresenterName: string | null;
    marketPresenterName: string | null;
    corporatePresenter: string | null;
    marketPresenter: string | null;
  };
  showPresenters?: boolean;
  showDelete?: boolean;
  onDelete?: (id: Id<"resources">) => void;
}

export function ResourceCard({
  resource,
  showPresenters,
  showDelete,
  onDelete,
}: ResourceCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{resource.title}</p>
            {resource.eventDate && (
              <p className="text-xs text-muted-foreground">
                {formatDate(resource.eventDate)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
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
            {showDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(resource._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {showPresenters &&
          (resource.corporatePresenterName || resource.marketPresenterName) && (
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
              {resource.corporatePresenterName &&
                resource.marketPresenterName && <span> & </span>}
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
  );
}
