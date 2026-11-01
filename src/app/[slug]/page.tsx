import { publicPath } from "@/lib/public-path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import katex from "katex";
import { ReadingLayout } from "@/components/proof-atlas/ReadingLayout";
import { ReportOutline } from "@/components/proof-atlas/ReportOutline";
import { Reasoning } from "@/components/proof-atlas/Reasoning";
import { Witness } from "@/components/proof-atlas/Witness";
import { ClaimIllustration } from "@/components/proof-atlas/ClaimIllustration";
import type { Finding, FindingSummary } from "@/components/proof-atlas/types";
import { severityLabels, issueTypeLabels } from "@/components/proof-atlas/types";
import { InlineText, RichText } from "@/components/proof-atlas/RichText";
import { Citation } from "@/components/proof-atlas/Citation";
import { PaperHeader } from "@/components/proof-atlas/PaperHeader";
import { SeverityScale } from "@/components/proof-atlas/SeverityScale";
import { CatalogueLink, ReportLink } from "@/components/proof-atlas/CatalogueLink";
import neuripsRecords from "@/data/proof-atlas-neurips-2026.json";
import records from "@/data/proof-atlas.json";

import addressedRecords from "@/data/proof-atlas-addressed.json";
import neuripsAddressedRecords from "@/data/proof-atlas-neurips-2026-addressed.json";
import { AddressedNote } from "@/components/proof-atlas/AddressedNote";
const addressed = [...addressedRecords, ...neuripsAddressedRecords] as FindingSummary[];
const findings = [...records, ...neuripsRecords] as Finding[];
const math = (tex: string) => katex.renderToString(tex, { displayMode: true, throwOnError: true, trust: false, strict: "error" });
export function generateStaticParams() { return [...findings, ...addressed].map(f => ({ slug: f.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = [...findings, ...addressed].find(f => f.slug === slug);
  if (!f) return { title: "Finding not found" };
  return { title: `${f.issueTitle} — Proof Notes`, description: `${f.title}: a scoped review of ${"location" in f ? f.location : "linked follow-up material"}.`,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: `${f.issueTitle} — Proof Notes`, description: f.plainExplanation, url: `/${slug}`, images: "/opengraph-image" },
    twitter: { title: `${f.issueTitle} — Proof Notes`, description: f.plainExplanation, card: "summary_large_image", images: "/opengraph-image" } };
}
export default async function FindingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = addressed.find(f => f.slug === slug);
  const selected = note ?? findings.find(f => f.slug === slug);
  if (!selected) notFound();
  const sections = note ? [] : [["claim", "Claim"], ["plain", "What is wrong"], ["reasoning", "Evidence"], ["impact", "Why it matters"], ["repair", "Possible repair"], ...("caveats" in selected && (selected.statusExplanation || selected.caveats.length) ? [["scope", "Scope"]] : [])].map(([id, title]) => ({ id, title }));
  const sidebar = <ReportOutline findings={[{ id: "check-1", title: selected.issueTitle, severity: selected.severity, sections }]} context={!note} />;
  if (note) return <><div className="pa-topline"><CatalogueLink>← All papers</CatalogueLink></div><ReadingLayout sidebar={sidebar}><AddressedNote finding={note} /></ReadingLayout></>;
  const f = findings.find(f => f.slug === slug);
  if (!f) notFound();
  const next = findings[(findings.indexOf(f) + 1) % findings.length];
  const reproductionUrl = f.reproductionUrl ?? (f.collection ? undefined : "/data/proof-atlas/reproduce.py");
  const demos: Record<string, "jump" | "infovae" | "dps" | "cql" | "numerics"> = { "E-ARC-15": "jump", "IG007": "infovae", "IG045": "dps", "E-RL-05": "cql", "IG023": "numerics" };
  const illustrations: Record<string, "local-iterates" | "bear-actions" | "belief-conditioning" | "contracting-bound"> = { "IARC-073": "local-iterates", "IR009": "bear-actions", "NOM-2502.01954": "belief-conditioning", "SUS26-153606-01": "contracting-bound" };
  return <>
    <div className="pa-topline"><CatalogueLink>← All papers</CatalogueLink></div>
    <ReadingLayout sidebar={sidebar}>
      <article className={`pa-article pa-paper-report ${f.severity ? `pa-severity-${f.severity}` : ""}`}>
        <PaperHeader paperTitle={f.title} primaryUrl={f.primaryUrl} severity={f.severity} issueTypes={f.issueTypes} year={f.year} category={f.category} collection={f.collection} version={f.version}><Citation finding={f} /><SeverityScale value={f.severity} /></PaperHeader>
        <p className="pa-version"><ReportLink slug={slug} noteUrl={`/review?paper=${encodeURIComponent(slug)}`}>All mathematical checks →</ReportLink></p>
        <details id="context" className="pa-section pa-context pa-paper-context"><summary>Paper context</summary><RichText text={f.paperSummary} /><h3>Role of the theory</h3><RichText text={f.theoryRole} /><a className="pa-context-source" href={f.primaryUrl} target="_blank" rel="noopener noreferrer">Original paper ↗</a></details>
        <details id="check-1" className={`pa-finding pa-editorial-finding pa-severity-${f.severity}`} open><summary className="pa-finding-summary"><span className="pa-finding-number">01</span><span className="pa-finding-heading"><span className="pa-finding-title" role="heading" aria-level={2}><InlineText text={f.issueTitle} /></span><span className="pa-finding-meta">{f.severity && <span className={`pa-review-grade pa-severity-${f.severity}`}>{severityLabels[f.severity]}</span>}{f.issueTypes?.map(type => <span key={type} className="pa-issue-tag">{issueTypeLabels[type] ?? type.replaceAll("_", " ")}</span>)}</span></span><span className="pa-finding-toggle" aria-hidden="true" /></summary><div className="pa-finding-body">
        <p className="pa-location"><strong>Location</strong><InlineText text={f.location} /> · paraphrased</p><section id="claim" className="pa-review-block pa-claim"><h3>Claim</h3><RichText text={f.originalClaim} />{f.formula && <div className="pa-math" dangerouslySetInnerHTML={{ __html: math(f.formula) }} />}
          <details className="pa-assumptions" open><summary>Relevant assumptions <span>↘</span></summary><ul>{f.assumptions.map((a, i) => <li key={i}><InlineText text={a} /></li>)}</ul></details>
        </section>
        <section id="plain" className="pa-review-block"><h3>What is wrong</h3><RichText text={f.plainExplanation} />{f.statusExplanation && <RichText text={f.statusExplanation} />}</section>
        <section id="reasoning" className="pa-review-block"><h3>Evidence</h3><Reasoning steps={f.steps.map(s => ({ title: s.title, text: s.text, math: s.formula ? math(s.formula) : undefined }))} />
          <div className="pa-witness"><div className="pa-witness-heading"><span aria-hidden="true">{f.status === "counterexample" ? "≠" : "?"}</span><h4>{f.status === "counterexample" ? "Counterexample" : "What the example establishes"}</h4></div><RichText text={f.counterexample} />{f.witnessFormula && <div className="pa-math" dangerouslySetInnerHTML={{ __html: math(f.witnessFormula) }} />}</div>
          {demos[f.auditId] && <Witness kind={demos[f.auditId]} />}
          {illustrations[f.auditId] && <ClaimIllustration kind={illustrations[f.auditId]} />}
        </section>
        <section id="impact" className="pa-review-block"><h3>Why it matters</h3><div className="pa-impact-grid"><div><h4>Affected result</h4><RichText text={f.impact} /></div><div><h4>Practical implications</h4><RichText text={f.practical} /></div></div></section>
        <section id="repair" className="pa-review-block pa-repair"><h3>Possible repair</h3><RichText text={f.repair} />{f.repairFormula && <div className="pa-math" dangerouslySetInnerHTML={{ __html: math(f.repairFormula) }} />}{f.repairProofFormula && <div className="pa-math" dangerouslySetInnerHTML={{ __html: math(f.repairProofFormula) }} />}<h4>Does the code need to change?</h4><RichText text={f.implementation} /></section>
        {(f.statusExplanation || f.caveats.length > 0) && <section id="scope" className="pa-review-block pa-review-scope"><h3>Scope</h3>{f.statusExplanation && <RichText text={f.statusExplanation} />}{f.caveats.length > 0 && <ul>{f.caveats.map((c, i) => <li key={i}><InlineText text={c} /></li>)}</ul>}</section>}
        </div></details>
        <section id="sources" className="pa-section"><h2>Sources</h2><ol className="pa-sources">{f.sources.map((s, i) => <li key={i}><span>{String(i + 1).padStart(2, "0")}</span><div><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label} ↗</a>{s.location && <RichText text={s.location} />}</div></li>)}</ol>{reproductionUrl && <a className="pa-correction-link" href={publicPath(reproductionUrl)} download>Rerun the counterexample · Python, no dependencies ↓</a>}<details className="pa-search-history"><summary>Correction search</summary><RichText text={f.correctionSearch} /><p>A bounded search is not evidence of priority or proof that no correction exists.</p></details><p className="pa-provenance"><Link href="/methodology">Scope and methodology</Link>.</p><a className="pa-correction-link" href={`https://github.com/maclandrol/proofnote/issues/new?title=${encodeURIComponent(`Proof Notes: ${f.title}`)}&body=${encodeURIComponent(`Claim: ${f.location}\n\nPrimary source or counterargument:\n`)}`}>Suggest a correction with a source ↗</a></section>
        {next.slug !== slug && <ReportLink className="pa-next" slug={next.slug}><span>Next paper</span><strong><InlineText text={next.title} /></strong><i aria-hidden="true">→</i></ReportLink>}
      </article>
    </ReadingLayout>
  </>;
}
