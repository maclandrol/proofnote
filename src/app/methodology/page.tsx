import Link from "next/link";
import { CatalogueLink } from "@/components/proof-atlas/CatalogueLink";
import { severities, severityDescriptions, severityLabels } from "@/components/proof-atlas/types";
import corpus from "@/data/proof-atlas-corpus.json";
import scanned from "@/data/proof-atlas-scan-counts.json";

export const metadata = { title: "Methodology — Proof Notes" };

export default function MethodologyPage() {
  return <article className="pa-methodology">
    <div className="pa-topline"><CatalogueLink>← All papers</CatalogueLink></div>
    <header>
      <h1 className="pa-subpage-title">How it works</h1>
      <p className="pa-lead">Frontier LLMs read the mathematical claims in ML papers, check each argument against its own assumptions and, where possible, propose a repair. Every report states the claim, what fails, the evidence, how much it matters and how it could be fixed.</p>
    </header>
    <aside className="pa-callout" aria-label="Status of these analyses">
      The analyses, explanations and checks were produced by GPT 6.1 Sol, Claude and DeepSeek. Most have not been verified by a human. If you are an author of a reviewed paper, or anything here is wrong, please <a href="https://github.com/maclandrol/proofnote/issues/new">get in touch</a>.
    </aside>
    <nav className="pa-section-nav" aria-label="On this page">
      <a href="#method">Checking a claim</a><a href="#severity">Severity</a><a href="#coverage">Coverage</a><a href="#corrections">Corrections</a>
    </nav>
    <section id="method" className="pa-section">
      <h2>Checking a claim</h2>
      <ol className="pa-method-steps">
        <li><strong>Read the statement in context.</strong> Pin down the definitions, assumptions and paper version.</li>
        <li><strong>Test the argument.</strong> Trace the disputed step and check every construction against the stated assumptions, with calculations or explicit counterexamples.</li>
        <li><strong>Trace the consequences.</strong> Identify which later results depend on that step and what a correction must establish.</li>
      </ol>
      <p>The approach follows the component and dependency method in <a href="https://nnhieu.github.io/assets/pdf/Auditing_mathematic.pdf">Nguyen and Zhang’s slides</a> and <a href="https://github.com/NNHieu/math_auditing_examples">published workflow</a>.</p>
    </section>
    <section id="severity" className="pa-section">
      <h2>Severity</h2>
      <dl className="pa-severity-guide">
        {severities.map(severity => <div key={severity}>
          <dt><span className={`pa-review-grade pa-severity-${severity}`}>{severityLabels[severity]}</span></dt>
          <dd>{severityDescriptions[severity]}</dd>
        </div>)}
      </dl>
      <p>Each finding is graded by what the error breaks: notation, a fixable step, a stated result or the main theorem. Grades then went through an editorial consistency pass, and a paper takes the highest grade among its findings. Severity describes the checked claim only: a broken proof step does not make the theorem false, and a failed lemma does not overturn experiments. Labels such as <strong>Lemma error</strong> or <strong>Proof gap</strong> name the kind of problem. Papers with no issues are hidden in the index by default.</p>
    </section>
    <section id="coverage" className="pa-section">
      <h2>Coverage</h2>
      <dl className="pa-method-coverage">
        <div><dt>Papers indexed</dt><dd>{scanned.totalScanned.toLocaleString("en-US")}</dd></div>
        <div><dt>NeurIPS 2026</dt><dd><Link href="/?tag=neurips-2026">{scanned.collections["neurips-2026"].toLocaleString("en-US")}</Link></dd></div>
        <div><dt>Other collections</dt><dd><Link href="/?tag=others">{corpus.paperCount.toLocaleString("en-US")}</Link></dd></div>
      </dl>
      <p>Indexed does not mean every proof was checked: reviews examine selected claims. The earlier cohort holds {corpus.initialPaperCount} papers with at least {corpus.citationThreshold} citations plus {corpus.additionalPaperCount} reader-nominated papers; citation counts are dated Semantic Scholar snapshots. Paper links go to the primary source, and findings name the version checked.</p>
    </section>
    <section id="corrections" className="pa-section">
      <h2>Corrections and prior work</h2>
      <p>When a later version, author code or a public discussion addresses an issue, the report says what it changes: a formula, an argument or the scope of a statement.</p>
      <p>Prior reports were searched for selected detailed notes only. Notes from the earlier collections were checked against <a href="https://pubpeer.com/">PubPeer</a>, Optimend, MathAudit, paperiswrong, the Black Spatula list and the materials for Bianchi et al. NeurIPS 2026 notes were checked against <a href="https://pith.science/">Pith</a>, arXiv version histories and the authors’ repositories; OpenReview reviews could not be retrieved. Other reports were not searched systematically, although some cite earlier analyses. A listing is not the same error report, and a clean search does not establish priority or rule out an existing correction.</p>
      <a className="pa-correction-link" href="https://github.com/maclandrol/proofnote/issues/new?title=Proof%20Notes%3A%20correction&body=Paper%20and%20claim%3A%0A%0APrimary%20source%20or%20counterargument%3A%0A">Suggest a correction with a source ↗</a>
    </section>
  </article>;
}
