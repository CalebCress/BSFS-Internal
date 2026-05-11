"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { currentTrackrSeason } from "./internships";

const BASE_URL = "https://api.the-trackr.com";

interface TrackrCompany {
  id?: string;
  name?: string;
  description?: string;
}

interface TrackrProgramme {
  id?: string | null;
  name?: string | null;
  companyId?: string | null;
  url?: string | null;
  region?: string | null;
  industry?: string | null;
  season?: string | null;
  type?: string | null;
  categories?: string[] | null;
  locations?: string[] | null;
  process?: string | null;
  openingDate?: string | null;
  closingDate?: string | null;
  currentStage?: string | null;
  rolling?: boolean | null;
  cv?: boolean | null;
  coverLetter?: string | null;
  writtenAnswers?: string | null;
  company?: TrackrCompany | null;
}

function parseDate(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? undefined : ts;
}

async function fetchSeason(season: string): Promise<TrackrProgramme[]> {
  const params = new URLSearchParams({
    region: "UK",
    industry: "Finance",
    season,
    type: "summer-internships",
  });
  const url = `${BASE_URL}/programmes?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`The Trackr API returned ${res.status}`);
  }
  const data = (await res.json()) as TrackrProgramme[];
  return Array.isArray(data) ? data : [];
}

function normalise(p: TrackrProgramme) {
  // Drop entries that lack the fields we treat as required.
  if (!p.id || !p.name || !p.url) return null;

  return {
    externalId: p.id,
    name: p.name,
    companyName: p.company?.name ?? p.companyId ?? "Unknown",
    companyId: p.companyId ?? undefined,
    companyDescription: p.company?.description ?? undefined,
    url: p.url,
    region: p.region ?? undefined,
    industry: p.industry ?? undefined,
    type: p.type ?? undefined,
    categories: Array.isArray(p.categories) ? p.categories.filter((c): c is string => !!c) : [],
    locations: Array.isArray(p.locations) ? p.locations.filter((l): l is string => !!l) : [],
    process: p.process ?? undefined,
    openingDate: parseDate(p.openingDate),
    closingDate: parseDate(p.closingDate),
    currentStage: p.currentStage ?? undefined,
    rolling: typeof p.rolling === "boolean" ? p.rolling : undefined,
    requiresCv: typeof p.cv === "boolean" ? p.cv : undefined,
    coverLetter: p.coverLetter ?? undefined,
    writtenAnswers: p.writtenAnswers ?? undefined,
    sponsorsVisa: undefined as string | undefined,
  };
}

type NormalisedProgramme = NonNullable<ReturnType<typeof normalise>>;

function normaliseAll(programmes: TrackrProgramme[]): NormalisedProgramme[] {
  return programmes
    .map(normalise)
    .filter((p): p is NormalisedProgramme => p !== null);
}

// Manual refresh — callable from the UI as a "refresh" affordance.
export const refresh = action({
  args: { season: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const season = args.season ?? currentTrackrSeason();
    const programmes = await fetchSeason(season);
    const normalised = normaliseAll(programmes);
    await ctx.runMutation(internal.internships.upsertTrackrProgrammes, {
      season,
      programmes: normalised,
    });
    return { season, count: normalised.length };
  },
});

// Cron entrypoint: refreshes the current season once per day.
export const dailySync = internalAction({
  args: {},
  handler: async (ctx) => {
    const season = currentTrackrSeason();
    const programmes = await fetchSeason(season);
    const normalised = normaliseAll(programmes);
    await ctx.runMutation(internal.internships.upsertTrackrProgrammes, {
      season,
      programmes: normalised,
    });
    return { season, count: normalised.length };
  },
});
