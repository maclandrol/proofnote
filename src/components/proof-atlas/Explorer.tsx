"use client";

import Link from "next/link";
import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Severity, FindingSummary } from "./types";
import { severities, severityLabels, defaultSeverities, findingSeverity, releaseFixLabel, issueTypeLabels, tagLabels, filterFindings } from "./types";
import { catalogueFilters, catalogueHref, reportHref } from "../../lib/catalogue-navigation";
import { Citation } from "./Citation";
import { InlineText } from "./RichText";

/** When set, `findings` holds only the first results and the full list is fetched from `url`. */
type Catalogue = { url: string; categories: string[]; severityCounts: Record<Severity, number>; defaultMatches: number };
type ExplorerProps = { findings: FindingSummary[]; compact?: boolean; active?: string; catalogue?: Catalogue };

export function Explorer(props: ExplorerProps) {
  return <Suspense fallback={<ExplorerBody {...props} />}><QueryExplorer {...props} /></Suspense>;
}

function QueryExplorer(props: ExplorerProps) {
  const searchParams = useSearchParams();
  return <ExplorerBody {...props} queryString={searchParams.toString()} />;
}

function ExplorerBody({ findings: initial, compact = false, active, catalogue, queryString = "" }: ExplorerProps & { queryString?: string }) {
  const filters = catalogueFilters(queryString);
  const [loaded, setLoaded] = useState<FindingSummary[] | null>(null);
  const findings = Array.isArray(loaded) ? loaded : initial;
  const pending = Boolean(catalogue) && findings === initial;
  const categories = useMemo(() => pending && catalogue ? catalogue.categories : Array.from(new Set(findings.map(f => f.category))).sort(), [findings, pending, catalogue]);
  const { query, selectedSeverities, sort, page } = filters;
  const category = !compact && categories.includes(filters.category) ? filters.category : "All fields";
  const tag = compact ? "all" : filters.tag;
  const context = new URLSearchParams(queryString);
  if (!categories.includes(filters.category)) context.delete("field");
  const filterContext = catalogueHref(context).split("?")[1] ?? "";
  const top = useRef<HTMLDivElement>(null);
  const [severityOpen, setSeverityOpen] = useState(false);
  const severityId = useId();
  const severityMenu = useRef<HTMLDivElement>(null);
  const severityTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const menu = severityMenu.current;
    if (!menu || !severityOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) setSeverityOpen(false);
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSeverityOpen(false);
        severityTrigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, [severityOpen]);
  useEffect(() => {
    if (!catalogue) return;
    let live = true;
    fetch(catalogue.url).then(response => response.ok ? response.json() : null).then((data: unknown) => { if (live && Array.isArray(data)) setLoaded(data as FindingSummary[]); }).catch(() => {});
    return () => { live = false; };
  }, [catalogue]);
  const filtered = filterFindings(findings, { query, category, tag, sort, selectedSeverities });
  // Counts ignore the severity selection so the overview always shows the full distribution for the other filters.
  const unfiltered = !query && category === "All fields" && tag === "all";
  // Until the full list arrives, the server's totals stand in for counts that need every paper.
  const total = !pending ? filtered.length : unfiltered && selectedSeverities.join() === defaultSeverities.join() ? catalogue!.defaultMatches : null;
  const severityCounts = compact ? null : pending && catalogue && unfiltered ? catalogue.severityCounts : filterFindings(findings, { query, category, tag, sort: "index", selectedSeverities: severities })
    .reduce((counts, f) => { const value = findingSeverity(f); if (value) counts[value]++; return counts; }, Object.fromEntries(severities.map(value => [value, 0])) as Record<Severity, number>);
  const graded = severityCounts ? severities.reduce((sum, value) => sum + severityCounts[value], 0) : 0;
  function writeFilters(filters: URLSearchParams, replace = false) {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["q", "tag", "field", "severity", "sort", "page"]) params.delete(key);
    for (const [key, value] of new URLSearchParams(catalogueHref(filters).split("?")[1])) params.set(key, value);
    window.history[replace ? "replaceState" : "pushState"](null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }
  function changeFilter(key: string, value: string, replace = false) {
    const params = new URLSearchParams(window.location.search);
    if ((value === "all" && key !== "severity") || value === "All fields" || !value) params.delete(key); else params.set(key, value);
    if (key !== "page") params.delete("page");
    writeFilters(params, replace);
  }
  function changeSeverities(values: Severity[]) { changeFilter("severity", values.length ? values.join(",") : "none"); }
  function clearFilters() { writeFilters(new URLSearchParams()); }
  function fieldHref(field: string, value: string) {
    const params = new URLSearchParams(filterContext);
    params.set(field, value);
    params.delete("page");
    return catalogueHref(params);
  }

  const pageSize = compact ? 20 : 10;
  const pages = Math.max(1, Math.ceil((total ?? filtered.length) / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  const visible = filtered.slice(offset, offset + pageSize);
  function changePage(value: number) { changeFilter("page", String(value)); top.current?.scrollIntoView({ block: "start" }); }
  return <div ref={top} className={compact ? "pa-explorer pa-compact" : "pa-explorer"}>
    {severityCounts && graded > 0 && <div className="pa-severity-overview">
      <div className="pa-severity-bar" aria-hidden="true">{[...severities].reverse().map(value => severityCounts[value] > 0 && <span key={value} className={`pa-severity-${value}${selectedSeverities.includes(value) ? "" : " pa-severity-off"}`} style={{ flexGrow: severityCounts[value] }} />)}</div>
      <div className="pa-severity-legend" role="group" aria-label="Show or hide papers by severity">{[...severities].reverse().map(value => <button key={value} type="button" className={`pa-severity-${value}`} aria-pressed={selectedSeverities.includes(value)} onClick={() => changeSeverities(selectedSeverities.includes(value) ? selectedSeverities.filter(selected => selected !== value) : [...selectedSeverities, value])}><i aria-hidden="true" />{severityLabels[value]} <strong>{severityCounts[value].toLocaleString("en-US")}</strong></button>)}</div>
    </div>}
    <div className="pa-controls">
      <label className="pa-search"><span aria-hidden="true">⌕</span><input aria-label="Search papers, authors and claims" placeholder="Search papers, authors, claims…" value={query} onChange={e => changeFilter("q", e.target.value, true)} /></label>
      <div className="pa-order-controls">
        {!compact && <label className="pa-select"><span>Collection</span><select aria-label="Paper collection" value={tag} onChange={e => changeFilter("tag", e.target.value)}><option value="all">All</option><option value="neurips-2026">NeurIPS 2026</option><option value="others">Others</option></select></label>}
        <div className="pa-select">
          <span>Severity</span>
          <div ref={severityMenu} className="pa-classifications" onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSeverityOpen(false); }}>
            <button ref={severityTrigger} type="button" className="pa-severity-trigger" aria-expanded={severityOpen} aria-controls={severityId} aria-label={`Finding severity: ${selectedSeverities.length} of ${severities.length} selected`} onClick={() => setSeverityOpen(value => !value)}><span>{selectedSeverities.length} / {severities.length} selected</span></button>
            {severityOpen && <div id={severityId} className="pa-classification-options" role="group" aria-label="Finding severity">
              <div className="pa-classification-actions"><button type="button" aria-label="Select all severities" onClick={() => changeSeverities(severities)}>Select all</button><button type="button" aria-label="Clear severity selection" onClick={() => changeSeverities([])}>Clear</button></div>
              {severities.map(value => <label key={value} className={`pa-severity-${value}`}><input type="checkbox" aria-label={severityLabels[value]} checked={selectedSeverities.includes(value)} onChange={e => changeSeverities(e.target.checked ? [...selectedSeverities, value] : selectedSeverities.filter(selected => selected !== value))} /><span className="pa-severity-label">{severityLabels[value]}</span></label>)}
            </div>}
          </div>
        </div>
        {!compact && <label className="pa-select"><span>Field</span><select aria-label="Research field" value={category} onChange={e => changeFilter("field", e.target.value)}><option>All fields</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>}
        <label className="pa-select"><span>Sort by</span><select aria-label="Sort entries" value={sort} onChange={e => changeFilter("sort", e.target.value)}>
          <option value="index">Index order</option>
          <option value="newest">Publication year · newest</option>
          <option value="oldest">Publication year · oldest</option>
          <option value="most-cited">Citations · highest</option>
          <option value="least-cited">Citations · lowest</option>
          <option value="title">Paper title · A–Z</option>
        </select></label>
      </div>
    </div>
    <div className="pa-results-meta" aria-live="polite"><span>{total === null ? "Loading all papers…" : <>Showing {total ? offset + 1 : 0}–{Math.min(offset + pageSize, total)} of {total.toLocaleString("en-US")} matching papers</>}</span>{compact && <span>Select an analysis</span>}<button type="button" className="pa-clear-filters" onClick={clearFilters}>Clear filters</button></div>
    <div className="pa-results">
      {visible.map((f, i) => {
        const severity = findingSeverity(f);
        const href = reportHref(f, filterContext);
        return <article key={f.slug} className={`pa-paper ${severity ? `pa-severity-${severity}` : ""} ${active === f.slug ? "pa-active" : ""} ${f.status === "addressed" || severity === "fixed" ? "pa-addressed" : ""}`}>
        {!compact && <span className="pa-paper-number">{String(offset + i + 1).padStart(2, "0")}</span>}
        <div className="pa-paper-copy"><div className="pa-paper-meta">{severity && <><span className={`pa-dot ${f.status}`} /><span className="pa-severity-label">{severityLabels[severity]}</span><span>·</span></>}{f.status === "addressed" && severity !== "fixed" && <><span>Follow-up</span><span>·</span></>}{releaseFixLabel(severity, f.fixedAt) && <><span className="pa-after-release" title={`Corrected in a version uploaded ${f.fixedAt!.slice(0, 10)}`}>{releaseFixLabel(severity, f.fixedAt)}</span><span>·</span></>}<span>{f.year}</span>{f.collection && <><span>·</span><Link href={fieldHref("tag", "neurips-2026")}>{tagLabels[f.collection]}</Link></>}</div>
          <h2><Link href={href} aria-current={active === f.slug ? "page" : undefined}><InlineText text={f.title} /></Link></h2><p className="pa-paper-title"><a href={f.primaryUrl} target="_blank" rel="noopener noreferrer">Original paper ↗</a></p>
          {severity && severity !== "no_issues" && f.issueTypes && f.issueTypes.length > 0 && <div className="pa-issue-types">{f.issueTypes.map(type => <span key={type}>{issueTypeLabels[type] ?? type.replaceAll("_", " ")}</span>)}</div>}
          <Citation finding={f} compact={compact} />
          {!compact && severity && <p className="pa-paper-summary"><InlineText text={f.plainExplanation} /></p>}
          {!compact && <Link className="pa-field" href={fieldHref("field", f.category)}>{f.category}</Link>}
        </div><Link className="pa-paper-arrow" href={href} aria-label={`Read report: ${f.title}`}>↗</Link>
      </article>;
      })}
    </div>
    {pages > 1 && <nav className="pa-pagination" aria-label="Results pages"><button disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>← Previous</button><span>Page {currentPage} of {pages}</span><button disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)}>Next →</button></nav>}
    {filtered.length === 0 && !pending && <div className="pa-empty"><h2>No matching papers</h2><p>Try another search or category.</p><button onClick={clearFilters}>Clear filters</button></div>}
  </div>;
}
