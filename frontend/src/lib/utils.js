import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Unisce classnames con deduplicazione consapevole di Tailwind. */
export const cn = (...inputs) => twMerge(clsx(inputs));

/** Formatta una data come stringa corta in italiano. */
export const formatDate = (d, opts = {}) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  });
};

export const formatTime = (d) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
