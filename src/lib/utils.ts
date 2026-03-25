import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date as "DD MMM YYYY" (e.g. "02 Mar 2026") */
export function formatDate(date: Date | number | string): string {
  const d = typeof date === "string" ? new Date(date + (date.includes("T") ? "" : "T00:00:00")) : new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
