import { publicPath } from "@/lib/public-path";
import { CatalogueLink } from "@/components/proof-atlas/CatalogueLink";
import projects from "@/data/related-projects.json";
export const metadata = { title: "Data and contributions — Proof Notes" };

const downloads: [string, string, string][] = [
  ["/data/proof-atlas/research-archive.zip", "Complete dataset · ZIP", "Every report and detailed note, the paper index, the calculation scripts and a manifest of file hashes."],
  ["/data/proof-atlas/scanned-papers.json", "Paper index · JSON", "One entry per paper: severity, issue types and a short summary."],
];

const scripts: [string, string][] = [
  ["/data/proof-atlas/reproduce.py", "reproduce.py"],
  ["/data/proof-atlas/reproduce-neurips-2026.py", "reproduce-neurips-2026.py"],
  ["/data/proof-atlas/reproduce-belief.py", "reproduce-belief.py"],
];

export default function ContributePage() {
  return <article className="pa-methodology">
    <div className="pa-topline"><CatalogueLink>← All papers</CatalogueLink></div>
    <header>
      <h1 className="pa-subpage-title">Data and contributing</h1>
      <p className="pa-lead">Everything behind the reports is open: download it, rerun the calculations, and tell us where an analysis is wrong.</p>
    </header>
    <section className="pa-section">
      <h2>Download</h2>
      <ul className="pa-download-list">{downloads.map(([path, label, description]) => <li key={path}><a href={publicPath(path)} download>{label} ↓</a><span>{description}</span></li>)}</ul>
      <h3>Rerun the counterexamples</h3>
      <p>Three standard-library Python scripts recompute the exact numbers behind the counterexamples in the detailed notes: {scripts.map(([path, name], i) => <span key={path}>{i > 0 && (i === scripts.length - 1 ? " and " : ", ")}<a href={publicPath(path)} download><code>{name}</code></a></span>)}.</p>
    </section>
    <section className="pa-section">
      <h2>Challenge a finding</h2>
      <p>Found a mistake in a report, or an earlier correction we missed? Open an issue with the paper version, the exact statement and your argument or source.</p>
      <div className="pa-downloads"><a href="https://github.com/maclandrol/proofnote/issues/new">Open an issue ↗</a><a href="https://github.com/maclandrol/proofnote/blob/main/CONTRIBUTING.md">Contribution guide ↗</a></div>
    </section>
    <section id="related-projects" className="pa-section">
      <h2>Related work</h2>
      <ul className="pa-related-list">{projects.map(project => <li key={project.url}><a href={project.url} target="_blank" rel="noopener noreferrer">{project.title} ↗</a><span>{project.description}</span></li>)}</ul>
    </section>
  </article>;
}
