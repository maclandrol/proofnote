import { publicPath } from "@/lib/public-path";
import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { Explorer } from "@/components/proof-atlas/Explorer";
import type { FindingSummary, Severity } from "@/components/proof-atlas/types";
import { defaultSeverities, filterFindings, findingSeverity, severities } from "@/components/proof-atlas/types";

const scanned = JSON.parse(readFileSync(join(process.cwd(), "public/data/proof-atlas/scanned-papers.json"), "utf8")) as { totalScanned: number };
// The full list is fetched by the browser; the page ships only the first results and the totals the controls need.
const entries = JSON.parse(readFileSync(join(process.cwd(), "public/data/proof-atlas/catalogue.json"), "utf8")) as FindingSummary[];
const defaults = filterFindings(entries, { query: "", category: "All fields", tag: "all", sort: "newest", selectedSeverities: defaultSeverities });
const severityCounts = Object.fromEntries(severities.map(value => [value, entries.filter(f => findingSeverity(f) === value).length])) as Record<Severity, number>;
const catalogue = {
  url: publicPath("/data/proof-atlas/catalogue.json"),
  categories: Array.from(new Set(entries.map(f => f.category))).sort(),
  severityCounts,
  defaultMatches: defaults.length,
};

export const metadata: Metadata = {
  title: "Proof Notes: Technical notes on machine learning theory",
  description: "Technical analyses of selected statements in machine learning theory, with explicit counterexamples, derivations and proposed corrections.",
  alternates: { canonical: "/" },
  openGraph: { title: "Proof Notes", description: "Claims, counterexamples and possible repairs in machine learning theory.", url: "/" },
  twitter: { card: "summary_large_image", title: "Proof Notes", description: "Claims, counterexamples and possible repairs in machine learning theory." },
};

export default function ProofAtlasPage() {
  return <>
    <header className="pa-intro"><div><p className="pa-eyebrow">Checking theoretical claims in ML</p><h1>Proof <em>Notes.</em></h1></div><div className="pa-intro-note"><p>Automated mathematical claim checking with frontier LLMs.</p><Link href="/methodology">How it works →</Link></div></header>
    <div className="pa-scope-line"><span><strong>{scanned.totalScanned.toLocaleString("en-US")}</strong> papers scanned</span></div>
    <Explorer findings={defaults.slice(0, 10)} catalogue={catalogue} />
  </>;
}
