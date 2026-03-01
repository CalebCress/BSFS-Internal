import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface SearchResult {
  ticker: string;
  name: string;
  market: string;
  primaryExchange: string;
}

export function StockSearchCombobox() {
  const navigate = useNavigate();
  const searchTickers = useAction(api.massive.searchTickers);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      searchTickers({ query: query.trim() })
        .then((data) => {
          setResults(data.results);
          setOpen(data.results.length > 0);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchTickers]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks by ticker or name..."
          className="pl-9"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.ticker}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
              onClick={() => {
                navigate(`/stocks/${r.ticker}`);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="font-semibold text-sm">{r.ticker}</span>
              <span className="text-sm text-muted-foreground truncate">
                {r.name}
              </span>
              {r.primaryExchange && (
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {r.primaryExchange}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-4 text-center text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
}
