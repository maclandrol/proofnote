import type { ReactNode } from "react";
import { CatalogueLink } from "./CatalogueLink";
import { InlineText } from "./RichText";
import { issueTypeLabels, severityLabels, tagLabels, type Severity } from "./types";

type PaperHeaderProps = {
  paperTitle: string;
  primaryUrl: string;
  severity?: string | null;
  issueTypes?: string[];
  year: number;
  category: string;
  collection?: "neurips-2026";
  version?: string;
  firstUploadedAt?: string;
  latestUploadedAt?: string;
  followUpLabel?: string;
  children?: ReactNode;
};

export function PaperHeader({ paperTitle, primaryUrl, severity, issueTypes, year, category, collection, version, firstUploadedAt, latestUploadedAt, followUpLabel, children }: PaperHeaderProps) {
  return <header className="pa-article-header">
    <div className="pa-paper-meta">
      {severity && Object.hasOwn(severityLabels, severity) && <><span className={`pa-review-grade pa-severity-${severity}`}>{severityLabels[severity as Severity]}</span><span>·</span></>}
      {followUpLabel && <><span className={followUpLabel.endsWith("after Proof Notes") ? "pa-after-release" : undefined}>{followUpLabel}</span><span>·</span></>}
      <span>{year}</span><span>·</span><CatalogueLink field={category}>{category}</CatalogueLink>
      {collection && <><span>·</span><CatalogueLink tag={collection}>{tagLabels[collection]}</CatalogueLink></>}
    </div>
    <h1><InlineText text={paperTitle} /></h1>
    {severity !== "no_issues" && Boolean(issueTypes?.length) && <div className="pa-paper-issues">{issueTypes?.map(type => <span className="pa-issue-tag" key={type}>{issueTypeLabels[type] ?? type.replaceAll("_", " ")}</span>)}</div>}
    <p className="pa-version"><a href={/^https?:\/\//i.test(primaryUrl) ? primaryUrl : undefined} target="_blank" rel="noopener noreferrer">Original paper ↗</a>{version && <> · {version}</>}</p>
    {(firstUploadedAt || latestUploadedAt) && <p className="pa-version">{firstUploadedAt && <>First uploaded <time dateTime={firstUploadedAt} title={firstUploadedAt}>{firstUploadedAt.slice(0, 10)}</time></>}{latestUploadedAt && latestUploadedAt.slice(0, 10) !== firstUploadedAt?.slice(0, 10) && <>{firstUploadedAt && " · "}Latest upload <time dateTime={latestUploadedAt} title={latestUploadedAt}>{latestUploadedAt.slice(0, 10)}</time></>}</p>}
    {children}
  </header>;
}
