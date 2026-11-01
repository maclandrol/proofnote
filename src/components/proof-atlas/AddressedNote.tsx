import { InlineText, RichText } from "./RichText";
import { Citation } from "./Citation";
import Link from "next/link";
import type { FindingSummary } from "./types";
import { PaperHeader } from "./PaperHeader";
import { ReportLink } from "./CatalogueLink";
import { severityLabels } from "./types";

export function AddressedNote({ finding: f }: { finding: FindingSummary }) {
  const treatment = ({ revision: "Revised statement", discussion: "Public discussion", "later-work": "Subsequent analysis", implementation: "Implementation treatment", qualification: "Author qualification" } as Record<string, string>)[f.resolutionType ?? ""] ?? "Follow-up material";
  return <>
    <article className={`pa-article pa-paper-report pa-addressed-note ${f.severity ? `pa-severity-${f.severity}` : ""}`}>
      <PaperHeader paperTitle={f.title} primaryUrl={f.primaryUrl} severity={f.severity} issueTypes={f.issueTypes} year={f.year} category={f.category} collection={f.collection} followUpLabel={treatment}><Citation finding={f} /></PaperHeader>
      <p className="pa-version"><ReportLink slug={f.slug} noteUrl={`/review?paper=${encodeURIComponent(f.slug)}`}>All mathematical checks →</ReportLink></p>
      <details id="check-1" className={`pa-finding pa-editorial-finding pa-severity-${f.severity}`} open><summary className="pa-finding-summary"><span className="pa-finding-number">01</span><span className="pa-finding-heading"><span className="pa-finding-title" role="heading" aria-level={2}><InlineText text={f.issueTitle} /></span><span className="pa-finding-meta">{f.severity && <span className={`pa-review-grade pa-severity-${f.severity}`}>{severityLabels[f.severity]}</span>}<span>{treatment}</span></span></span><span className="pa-finding-toggle" aria-hidden="true" /></summary><div className="pa-finding-body">
        <section className="pa-review-block"><h3>{f.resolutionType === "qualification" ? "Claim and author qualification" : "Issue and subsequent treatment"}</h3><RichText text={f.plainExplanation} /></section>
      </div></details>
      <section id="sources" className="pa-section"><h2>Sources</h2><ol className="pa-sources">{f.addressingSources?.map((s, i) => <li key={s.url}><span>{String(i + 1).padStart(2, "0")}</span><div><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label} ↗</a></div></li>)}</ol><p className="pa-provenance"><Link href="/methodology">Scope and methodology</Link></p></section>
    </article>
  </>;
}
