import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { REVIEW_TYPES, ROLES, type Role } from "@/lib/constants";

/** The two rounds this page covers, in the order the pipeline runs them. */
const TYPES = ["application", "telephone"] as const;

function Average({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">&mdash;</span>;
  }
  return <span className="tabular-nums">{value.toFixed(2)}</span>;
}

/**
 * How much reviewing each board member has done, and how generously.
 *
 * Averages are per category and never pooled across rounds: CV and Technical
 * are different questions, and one number spanning both would say nothing
 * about either.
 */
export function ReviewerStatsPage() {
  const rows = useQuery(api.reviews.reviewerOverview, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviewer Activity</h1>
        <p className="text-muted-foreground">
          Reviews conducted per person, and their average score in each
          category.
        </p>
      </div>

      {rows === undefined ? (
        <Skeleton className="h-[320px] w-full" />
      ) : rows === null ? (
        // Only reachable if the role changed mid-session; the route already
        // redirects. Says nothing about what the page contains.
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          You don&apos;t have access to this page.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-medium">No reviewers yet</p>
          <p className="text-sm">
            Board members appear here as soon as there are any.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>By reviewer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="align-bottom">
                      Reviewer
                    </TableHead>
                    {TYPES.map((type) => (
                      <TableHead
                        key={type}
                        colSpan={3}
                        className="border-l text-center"
                      >
                        {REVIEW_TYPES[type].label}
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow>
                    {TYPES.map((type) => (
                      <TypeSubHeaders key={type} type={type} rows={rows} />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.userId.toString()}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {row.name}
                          {row.role !== "board_member" && (
                            <Badge variant="outline" className="font-normal">
                              {ROLES[row.role as Role]?.label ?? row.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {row.byType.map((typeStats) => (
                        <TypeCells
                          key={typeStats.type}
                          count={typeStats.count}
                          categories={typeStats.categories}
                        />
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Rows = NonNullable<
  ReturnType<typeof useQuery<typeof api.reviews.reviewerOverview>>
>;

/** Reviews / <category> / <category> under each round's heading. */
function TypeSubHeaders({
  type,
  rows,
}: {
  type: (typeof TYPES)[number];
  rows: Rows;
}) {
  // Category labels come from the data rather than being repeated here, so the
  // columns follow REVIEW_CATEGORIES if it ever changes.
  const categories =
    rows[0]?.byType.find((t) => t.type === type)?.categories ?? [];

  return (
    <>
      <TableHead className="border-l text-right">Reviews</TableHead>
      {categories.map((category) => (
        <TableHead key={category.key} className="text-right">
          {category.label}
        </TableHead>
      ))}
    </>
  );
}

function TypeCells({
  count,
  categories,
}: {
  count: number;
  categories: { key: string; label: string; average: number | null }[];
}) {
  return (
    <>
      <TableCell className="border-l text-right">
        {count > 0 ? (
          <span className="tabular-nums">{count}</span>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </TableCell>
      {categories.map((category) => (
        <TableCell key={category.key} className="text-right">
          <Average value={category.average} />
        </TableCell>
      ))}
    </>
  );
}
