import { defaultSeverities, severities } from "../components/proof-atlas/types";

const sorts = ["index", "newest", "oldest", "most-cited", "least-cited", "title"];

export function catalogueFilters(search: string | URLSearchParams) {
  const params = new URLSearchParams(search);
  const requestedSeverities = params.get("severity");
  const knownSeverities = severities.filter(value => requestedSeverities?.split(",").includes(value));
  const requestedPage = params.get("page") ?? "1";
  return {
    query: params.get("q") ?? "",
    tag: ["neurips-2026", "others"].includes(params.get("tag") ?? "") ? params.get("tag")! : "all",
    category: params.get("field") || "All fields",
    selectedSeverities: requestedSeverities === "none" ? [] : requestedSeverities === "all" ? severities : knownSeverities.length ? knownSeverities : defaultSeverities,
    sort: sorts.includes(params.get("sort") ?? "") ? params.get("sort")! : "newest",
    page: /^[1-9]\d*$/.test(requestedPage) && Number.isSafeInteger(Number(requestedPage)) ? Number(requestedPage) : 1,
  };
}

export function catalogueHref(search: string | URLSearchParams = "") {
  const filters = catalogueFilters(search);
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.tag !== "all") params.set("tag", filters.tag);
  if (filters.category !== "All fields") params.set("field", filters.category);
  const selected = filters.selectedSeverities;
  if (!selected.length) params.set("severity", "none");
  else if (selected.length === severities.length) params.set("severity", "all");
  else if (selected.join(",") !== defaultSeverities.join(",")) params.set("severity", selected.join(","));
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page !== 1) params.set("page", String(filters.page));
  return params.size ? `/?${params}` : "/";
}

export function reportHref(finding: { slug: string; noteUrl?: string }, queryString = "") {
  const path = finding.noteUrl?.startsWith("/") && !finding.noteUrl.startsWith("//") && !finding.noteUrl.includes("\\") ? finding.noteUrl : `/${encodeURIComponent(finding.slug)}`;
  const report = new URL(path, "https://catalogue.invalid");
  const context = new URLSearchParams(catalogueHref(queryString).split("?")[1]);
  for (const [key, value] of context) report.searchParams.set(key, value);
  return `${report.pathname}${report.search}${report.hash}`;
}
