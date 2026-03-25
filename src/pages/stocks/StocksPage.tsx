import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingBadge } from "./components/RatingBadge";
import { StockSearchCombobox } from "./components/StockSearchCombobox";
import { ArrowUpDown, TrendingUp } from "lucide-react";

type SortField = "ticker" | "averageRating" | "thesisCount" | "latestThesisAt";
type SortDir = "asc" | "desc";

export function StocksPage() {
  const navigate = useNavigate();
  const stocks = useQuery(api.stocks.list);

  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("latestThesisAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "ticker" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    if (!stocks) return undefined;

    let result = stocks;

    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortField === "ticker") {
        return a.ticker.localeCompare(b.ticker) * dir;
      }

      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return (aVal - bVal) * dir;
    });

    return result;
  }, [stocks, filter, sortField, sortDir]);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown
        className={`h-3 w-3 ${sortField === field ? "opacity-100" : "opacity-30"}`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground">
            Search for stocks and read member investment theses.
          </p>
        </div>
        <StockSearchCombobox />
      </div>

      {/* Reviewed Stocks Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Reviewed Stocks</h2>
        <Input
          placeholder="Filter reviewed stocks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-3 max-w-xs"
        />

        {filtered === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">No reviewed stocks yet</p>
            <p className="text-sm">
              Search for a stock above and write a thesis to get started.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="px-4 py-3 text-left">
                    <SortButton field="ticker">Ticker</SortButton>
                  </th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortButton field="averageRating">Avg Rating</SortButton>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortButton field="thesisCount"># Theses</SortButton>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <SortButton field="latestThesisAt">
                      Latest Activity
                    </SortButton>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((stock) => (
                  <tr
                    key={stock._id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/stocks/${stock.ticker}`)}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {stock.ticker}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {stock.name}
                    </td>
                    <td className="px-4 py-3">
                      {stock.averageRating !== null ? (
                        <RatingBadge
                          rating={stock.averageRating}
                          size="sm"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{stock.thesisCount}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {stock.latestThesisAt
                        ? formatDate(stock.latestThesisAt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
