"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const BASE_URL = "https://api.massive.com";

function apiKey(): string {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY environment variable not set");
  return key;
}

export const searchTickers = action({
  args: { query: v.string() },
  handler: async (_ctx, args) => {
    const q = args.query.trim();
    if (!q) return { results: [] };

    const url = `${BASE_URL}/v3/reference/tickers?search=${encodeURIComponent(q)}&active=true&limit=20&apiKey=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Massive API error: ${res.status}`);
    const data = await res.json();

    return {
      results: (data.results ?? []).map((r: any) => ({
        ticker: r.ticker as string,
        name: r.name as string,
        market: r.market as string,
        primaryExchange: r.primary_exchange as string,
      })),
    };
  },
});

export const getTickerOverview = action({
  args: { ticker: v.string() },
  handler: async (_ctx, args) => {
    const url = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(args.ticker)}?apiKey=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Massive API error: ${res.status}`);
    const data = await res.json();
    const r = data.results;
    if (!r) return null;

    return {
      ticker: r.ticker as string,
      name: (r.name ?? "") as string,
      description: (r.description ?? "") as string,
      marketCap: (r.market_cap ?? null) as number | null,
      sharesOutstanding:
        (r.weighted_shares_outstanding ??
          r.share_class_shares_outstanding ??
          null) as number | null,
      homepageUrl: (r.homepage_url ?? null) as string | null,
      totalEmployees: (r.total_employees ?? null) as number | null,
      sicDescription: (r.sic_description ?? null) as string | null,
      listDate: (r.list_date ?? null) as string | null,
      primaryExchange: (r.primary_exchange ?? null) as string | null,
      branding: r.branding
        ? {
            iconUrl: (r.branding.icon_url ?? null) as string | null,
            logoUrl: (r.branding.logo_url ?? null) as string | null,
          }
        : null,
    };
  },
});

export const getAggregates = action({
  args: {
    ticker: v.string(),
    multiplier: v.number(),
    timespan: v.string(),
    from: v.string(),
    to: v.string(),
  },
  handler: async (_ctx, args) => {
    const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(args.ticker)}/range/${args.multiplier}/${args.timespan}/${args.from}/${args.to}?adjusted=true&sort=asc&apiKey=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Massive API error: ${res.status}`);
    const data = await res.json();

    return {
      results: (data.results ?? []).map((bar: any) => ({
        o: bar.o as number,
        h: bar.h as number,
        l: bar.l as number,
        c: bar.c as number,
        v: bar.v as number,
        vw: bar.vw as number,
        t: bar.t as number,
        n: bar.n as number,
      })),
    };
  },
});

export const getPreviousDayBar = action({
  args: { ticker: v.string() },
  handler: async (_ctx, args) => {
    const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(args.ticker)}/prev?adjusted=true&apiKey=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Massive API error: ${res.status}`);
    const data = await res.json();
    const bar = data.results?.[0];
    if (!bar) return null;

    return {
      o: bar.o as number,
      h: bar.h as number,
      l: bar.l as number,
      c: bar.c as number,
      v: bar.v as number,
      vw: bar.vw as number,
      t: bar.t as number,
    };
  },
});

export const getFinancials = action({
  args: { ticker: v.string() },
  handler: async (_ctx, args) => {
    const url = `${BASE_URL}/vX/reference/financials?ticker=${encodeURIComponent(args.ticker)}&timeframe=annual&order=desc&limit=1&sort=period_of_report_date&apiKey=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Massive API error: ${res.status}`);
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    const income = result.financials?.income_statement;

    return {
      eps: (income?.diluted_earnings_per_share?.value ??
        income?.basic_earnings_per_share?.value ??
        null) as number | null,
      periodOfReportDate: (result.period_of_report_date ?? null) as
        | string
        | null,
      fiscalYear: (result.fiscal_year ?? null) as string | null,
    };
  },
});
