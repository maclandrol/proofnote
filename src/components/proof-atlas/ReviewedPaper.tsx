"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { publicPath } from "@/lib/public-path";
import { ClaimIllustration } from "./ClaimIllustration";
import { ReviewIllustration } from "./ReviewIllustration";
import { PaperHeader } from "./PaperHeader";
import { ReportOutline } from "./ReportOutline";
import { SeverityScale } from "./SeverityScale";
import { ReadingLayout } from "./ReadingLayout";
import { CatalogueLink } from "./CatalogueLink";
import { InlineText, RichText } from "./RichText";
import { issueTypeLabels, severityLabels } from "./types";

type Review = {
  slug: string;
  title: string;
  year: number;
  category: string;
  status: string;
  classifications: string[];
  collection?: "neurips-2026";
  primaryUrl: string;
  version?: string;
  reviewDate?: string;
  firstUploadedAt?: string;
  latestUploadedAt?: string;
  reviewStage: string;
  publicationDisposition?: string;
  severity?: string | null;
  issueTypes?: string[];
  verificationStatus?: string;
  summary: string;
  paperSummary?: string;
  theoryRole?: string;
  checks: {
    id: string;
    originalIndex?: number;
    location: string;
    claim: string;
    verdict: string;
    explanation: string;
    demonstration?: string;
    repair?: string;
    scope?: string;
    severity?: string;
    sourceSha256?: string;
    reviewScope?: "outside_mathematics";
    duplicateOf?: string;
    title?: string;
    whyItMatters?: string;
    impactSeverity?: string | null;
    issueTypes?: string[];
    verificationNote?: string;
    verificationStatus?: string;
    resolution?: string;
    claimContext?: string;
    claimFormula?: string;
    contextBefore?: string;
    contextAfter?: string;
    checkedLocation?: string;
    checkedSource?: { url: string; version?: string; uploadedAt?: string; sha256: string; kind?: string };
    relatedSources?: { label: string; url: string; summary: string; publishedAt?: string; relationship?: string }[];
  }[];
  sources: { label: string; url: string }[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const stringArray = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === "string");
const optionalGrade = (value: unknown) => value === undefined || value === null || typeof value === "string";

function isCheckedSource(value: unknown) {
  return isObject(value) && typeof value.url === "string" && /^https:\/\//i.test(value.url)
    && typeof value.sha256 === "string" && /^[a-f0-9]{64}$/.test(value.sha256)
    && ["version", "uploadedAt", "kind"].every(key => value[key] === undefined || typeof value[key] === "string");
}

function isReview(value: unknown, slug: string): value is Review {
  return isObject(value) && value.slug === slug
    && ["title", "category", "status", "primaryUrl", "reviewStage", "summary"].every(key => typeof value[key] === "string")
    && typeof value.year === "number" && Number.isInteger(value.year)
    && ["version", "reviewDate", "firstUploadedAt", "latestUploadedAt", "publicationDisposition", "verificationStatus", "paperSummary", "theoryRole"].every(key => value[key] === undefined || typeof value[key] === "string")
    && optionalGrade(value.severity) && (value.issueTypes === undefined || stringArray(value.issueTypes))
    && (value.collection === undefined || value.collection === "neurips-2026")
    && stringArray(value.classifications)
    && Array.isArray(value.checks) && value.checks.every(check => isObject(check)
      && ["id", "location", "claim", "verdict", "explanation"].every(key => typeof check[key] === "string")
      && (check.originalIndex === undefined || typeof check.originalIndex === "number" && Number.isInteger(check.originalIndex) && check.originalIndex >= 0)
      && ["demonstration", "repair", "scope", "severity", "sourceSha256", "title", "whyItMatters", "verificationNote", "verificationStatus", "resolution", "claimContext", "claimFormula", "contextBefore", "contextAfter", "checkedLocation", "duplicateOf"].every(key => check[key] === undefined || typeof check[key] === "string")
      && (check.checkedSource === undefined || isCheckedSource(check.checkedSource))
      && (check.reviewScope === undefined || check.reviewScope === "outside_mathematics")
      && (check.relatedSources === undefined || Array.isArray(check.relatedSources) && check.relatedSources.every(report => isObject(report)
        && ["label", "url", "summary"].every(key => typeof report[key] === "string")
        && typeof report.url === "string" && /^https:\/\//i.test(report.url)
        && ["publishedAt", "relationship"].every(key => report[key] === undefined || typeof report[key] === "string")))
      && optionalGrade(check.impactSeverity) && (check.issueTypes === undefined || stringArray(check.issueTypes)))
    && hasValidDuplicateTargets(value.checks as Review["checks"])
    && Array.isArray(value.sources) && value.sources.every(source => isObject(source) && typeof source.label === "string" && typeof source.url === "string");
}

function hasValidDuplicateTargets(checks: Review["checks"]) {
  return checks.every(check => {
    if (check.duplicateOf === undefined) return true;
    const targets = checks.filter(target => target.id === check.duplicateOf);
    const target = targets[0];
    return check.duplicateOf.length > 0 && check.duplicateOf !== check.id && targets.length === 1
      && check.reviewScope !== "outside_mathematics" && isPublishedCheck(target)
      && target.duplicateOf === undefined && target.impactSeverity != null && check.impactSeverity === target.impactSeverity
      && (check.verificationStatus ?? check.verdict) === (target.verificationStatus ?? target.verdict);
  });
}

function labelFor(labels: Record<string, string>, value: string) {
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

const sourceHref = (url: string) => /^https?:\/\//i.test(url) ? url : undefined;
const sameText = (a: string | undefined, b: string | undefined) => a?.trim().replace(/\s+/g, " ") === b?.trim().replace(/\s+/g, " ");
const displayLocation = (location: string) => location.replace(/(?:;\s*)?work\/(?:text|full-corpus)\/[^\s;,]+/g, "").replace(/[;,\s]+$/, "");

function shortLocation(location: string) {
  const first = displayLocation(location).split(/[;\n]/, 1)[0];
  return first.length > 100 ? `${first.slice(0, 97).replace(/\s+\S*$/, "")}…` : first;
}

function Grade({ value }: { value?: string | null }) {
  return value && Object.hasOwn(severityLabels, value) ? <span className={`pa-review-grade pa-severity-${value}`}>{labelFor(severityLabels, value)}</span> : null;
}

function IssueTags({ values = [] }: { values?: string[] }) {
  return values.map(value => <span key={value} className="pa-issue-tag">{labelFor(issueTypeLabels, value)}</span>);
}

function isPublishedCheck(check: Review["checks"][number]) {
  if (check.reviewScope === "outside_mathematics" || check.duplicateOf !== undefined) return false;
  const verdict = check.verificationStatus ?? check.verdict;
  if (["refuted", "no_error_found", "resolved_in_original"].includes(verdict)) return true;
  return check.impactSeverity !== null && ["confirmed", "confirmed_but_rescoped", "addressed"].includes(verdict);
}

function checkSections(check: Review["checks"][number], anchorIndex: number) {
  const noIssue = ["refuted", "no_error_found", "resolved_in_original"].includes(check.verificationStatus ?? check.verdict);
  const claim = check.claimContext ?? (noIssue ? "" : check.claim);
  const scope = check.scope && ![check.explanation, check.demonstration, check.whyItMatters, check.repair].some(text => sameText(text, check.scope));
  return [
    ["claim", "Claim", claim || check.claimFormula],
    ["explanation", noIssue ? "Assessment" : "What is wrong", check.explanation],
    ["evidence", "Evidence", check.demonstration && !sameText(check.demonstration, check.explanation)],
    ["impact", "Why it matters", !noIssue && check.whyItMatters],
    ["repair", "Possible repair", !noIssue && check.repair],
    ["scope", "Scope", scope],
  ].filter(([, , visible]) => visible).map(([id, title]) => ({ id: `check-${anchorIndex + 1}-${id}`, title: String(title) }));
}

function Check({ check, index, anchorIndex = index, open }: { check: Review["checks"][number]; index: number; anchorIndex?: number; open: boolean }) {
  if (!isPublishedCheck(check)) return null;
  const verdict = check.verificationStatus ?? check.verdict;
  const noIssue = ["refuted", "no_error_found", "resolved_in_original"].includes(verdict);
  const location = check.checkedLocation ?? check.location;
  const claim = check.claimContext ?? (noIssue ? "" : check.claim);
  const scopeText = check.scope;
  const scope = scopeText && ![check.explanation, check.demonstration, check.whyItMatters, check.repair].some(text => sameText(text, scopeText)) ? scopeText : undefined;
  return <details className={`pa-finding pa-review-check pa-severity-${noIssue ? "no_issues" : check.impactSeverity}`} id={`check-${anchorIndex + 1}`} open={open}>
    <summary className="pa-finding-summary">
      <span className="pa-finding-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="pa-finding-heading">
        <span className="pa-finding-title" role="heading" aria-level={2}><InlineText text={check.title?.trim() || shortLocation(check.location) || (noIssue ? "Assessment" : "Claim assessment")} /></span>
        <span className="pa-finding-meta"><Grade value={noIssue ? "no_issues" : check.impactSeverity} />{verdict === "addressed" && check.impactSeverity !== "fixed" && <span>Follow-up</span>}{!noIssue && <IssueTags values={check.issueTypes} />}</span>
      </span>
      <span className="pa-finding-toggle" aria-hidden="true" />
    </summary>
    <div className="pa-finding-body">
      {location && <p className="pa-location"><strong>Location</strong><InlineText text={displayLocation(location)} /></p>}
      {check.checkedSource && <p className="pa-version"><a href={sourceHref(check.checkedSource.url)} target="_blank" rel="noopener noreferrer">Paper{check.checkedSource.version && <> · {check.checkedSource.version}</>} ↗</a>{check.checkedSource.uploadedAt && <> · Uploaded <time dateTime={check.checkedSource.uploadedAt}>{check.checkedSource.uploadedAt.slice(0, 10)}</time></>}</p>}
      {(claim || check.claimFormula) && <section id={`check-${anchorIndex + 1}-claim`} className="pa-review-block pa-claim"><h3>Claim</h3><RichText text={claim} />{check.claimFormula && <RichText text={`$$${check.claimFormula}$$`} />}
        {(check.contextBefore || check.contextAfter) && <details className="pa-source-context"><summary>Paper context</summary><div className="pa-claim-context">{check.contextBefore && <RichText text={check.contextBefore} />}{check.contextAfter && <RichText text={check.contextAfter} />}</div></details>}
      </section>}
      {check.explanation && <section id={`check-${anchorIndex + 1}-explanation`} className={noIssue ? "pa-review-block" : "pa-review-block pa-review-issue"}><h3>{noIssue ? "Assessment" : "What is wrong"}</h3><RichText text={check.explanation} /></section>}
      {check.demonstration && !sameText(check.demonstration, check.explanation) && <section id={`check-${anchorIndex + 1}-evidence`} className="pa-review-block pa-witness"><h3>Evidence</h3><RichText text={check.demonstration} /></section>}
      {check.id === "SUS26-153606-01" && <ClaimIllustration kind="contracting-bound" />}
      <ReviewIllustration checkId={check.id} />
      {!noIssue && check.whyItMatters && <section id={`check-${anchorIndex + 1}-impact`} className="pa-review-block"><h3>Why it matters</h3><RichText text={check.whyItMatters} /></section>}
      {!noIssue && check.repair && <section id={`check-${anchorIndex + 1}-repair`} className="pa-review-block pa-repair"><h3>Possible repair</h3><RichText text={check.repair} /></section>}
      {scope && <section id={`check-${anchorIndex + 1}-scope`} className="pa-review-block pa-review-scope"><h3>Scope</h3><RichText text={scope} /></section>}
      {Boolean(check.relatedSources?.length) && <section className="pa-review-block pa-related-sources"><h3>{check.relatedSources?.every(report => report.relationship === "author_qualification_separate_source") ? "Author documentation" : check.relatedSources?.some(report => report.relationship?.includes("issue")) ? "Earlier analysis" : "Related sources"}</h3>{check.relatedSources?.map(report => <div key={report.url}><p className="pa-version"><a href={sourceHref(report.url)} target="_blank" rel="noopener noreferrer">{report.label} ↗</a>{report.publishedAt && <> · <time dateTime={report.publishedAt}>{report.publishedAt.slice(0, 10)}</time></>}</p><RichText text={report.summary} /></div>)}</section>}
    </div>
  </details>;
}

export function ReviewedPaper() {
  const slug = useSearchParams().get("paper") ?? "";
  const validSlug = /^[a-z0-9-]+$/.test(slug);
  const [result, setResult] = useState<{ slug: string; review?: Review; error?: string } | null>(null);

  useEffect(() => {
    if (!validSlug) return;
    const controller = new AbortController();
    const shard = [...slug].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 64, 0);
    fetch(publicPath(`/data/proof-atlas/reviews/${shard}.json`), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? "not-found" : "unavailable");
        const payload: unknown = await response.json();
        if (!isObject(payload) || !Object.hasOwn(payload, slug)) throw new Error("not-found");
        const review = payload[slug];
        if (!isReview(review, slug)) throw new Error("invalid");
        if (!controller.signal.aborted) setResult({ slug, review });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const reason = error instanceof Error ? error.message : "unavailable";
        setResult({ slug, error: reason === "not-found" ? "Review not found." : reason === "invalid" ? "Could not read this review." : "Could not load this review." });
      });
    return () => controller.abort();
  }, [slug, validSlug]);

  const current = result?.slug === slug ? result : null;
  const review = current?.review;
  // Every report shares one static page, so name the tab after the paper once it loads.
  useEffect(() => { if (review) document.title = `${review.title} — Proof Notes`; }, [review]);
  const error = !slug ? "Choose a paper from the index." : !validSlug ? "Invalid paper link." : current?.error;

  const publishedChecks = review?.severity === null ? [] : review?.checks.filter(isPublishedCheck) ?? [];
  const leadingCheck = publishedChecks.find(check => check.impactSeverity === review?.severity) ?? publishedChecks[0];
  const hasIssues = publishedChecks.some(check => !["refuted", "no_error_found", "resolved_in_original"].includes(check.verificationStatus ?? check.verdict));
  // The header already links the paper, so sources that only repeat it are not listed again.
  const extraSources = review?.sources.filter(source => source.url !== review.primaryUrl) ?? [];
  const paperVersion = publishedChecks
    .filter(check => check.checkedSource?.url === review?.primaryUrl)
    .sort((a, b) => (a.checkedSource?.uploadedAt ?? "").localeCompare(b.checkedSource?.uploadedAt ?? ""))
    .at(-1)?.checkedSource?.version ?? review?.version;
  const sourceDates = publishedChecks
    .filter(check => ["html", "pdf"].includes(check.checkedSource?.kind ?? ""))
    .map(check => check.checkedSource?.uploadedAt);
  const latestUploadedAt = [review?.latestUploadedAt, ...sourceDates]
    .filter((date): date is string => Boolean(date)).sort().at(-1);

  return <>
    <div className="pa-topline"><CatalogueLink>← All papers</CatalogueLink></div>
    <ReadingLayout sidebar={review && <ReportOutline findings={publishedChecks.map(check => ({ id: `check-${(check.originalIndex ?? review.checks.indexOf(check)) + 1}`, title: check.title?.trim() || shortLocation(check.location) || "Assessment", severity: ["refuted", "no_error_found", "resolved_in_original"].includes(check.verificationStatus ?? check.verdict) ? "no_issues" : check.impactSeverity, sections: checkSections(check, check.originalIndex ?? review.checks.indexOf(check)) }))} context={Boolean(review.paperSummary)} sources={extraSources.length > 0} />}>
    <article className="pa-article pa-paper-report">
      {error ? <header className="pa-article-header"><h1>Review unavailable</h1><p role="alert">{error}</p></header>
        : !review ? <p role="status">Loading review…</p>
          : <>
            <PaperHeader paperTitle={review.title} primaryUrl={review.primaryUrl} severity={publishedChecks.length ? review.severity : undefined} issueTypes={hasIssues ? review.issueTypes : undefined} year={review.year} category={review.category} collection={review.collection} version={paperVersion} firstUploadedAt={review.firstUploadedAt} latestUploadedAt={latestUploadedAt} followUpLabel={review.status === "addressed" && review.severity !== "fixed" ? "Follow-up" : undefined}>{hasIssues && <SeverityScale value={review.severity} />}</PaperHeader>
            {review.paperSummary && <details id="context" className="pa-section pa-context pa-paper-context"><summary>Paper context</summary><RichText text={review.paperSummary} />{review.theoryRole && <><h3>Role of the theory</h3><RichText text={review.theoryRole} /></>}</details>}
            {publishedChecks.length === review.checks.length && publishedChecks.length > 0 && !review.paperSummary && review.summary && !publishedChecks.some(check => sameText(review.summary, check.explanation) || sameText(review.summary, check.demonstration)) && <section className="pa-section pa-context"><RichText text={review.summary} /></section>}
            {publishedChecks.length > 0 ? publishedChecks.map((check, index) => <Check key={`${check.id}-${index}`} check={check} index={index} anchorIndex={check.originalIndex ?? review.checks.indexOf(check)} open={check === leadingCheck} />) : <section className="pa-section"><p>No finding published for this paper.</p></section>}
            {extraSources.length > 0 && <section id="sources" className="pa-section"><h2>Sources</h2><ol className="pa-sources">{extraSources.map((source, index) => <li key={`${source.url}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><a href={sourceHref(source.url)} target="_blank" rel="noopener noreferrer"><InlineText text={source.label} /> ↗</a></div></li>)}</ol></section>}
          </>}
    </article>
    </ReadingLayout>
  </>;
}
