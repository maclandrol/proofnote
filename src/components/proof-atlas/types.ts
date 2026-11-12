export type Finding = {
  slug: string;
  title: string;
  issueTitle: string;
  year: number;
  category: string;
  status: "counterexample";
  statusExplanation?: string;
  collection?: "neurips-2026";
  version: string;
  location: string;
  originalClaim: string;
  formula?: string;
  assumptions: string[];
  plainExplanation: string;
  steps: { title: string; text: string; formula?: string }[];
  counterexample: string;
  witnessFormula?: string;
  impact: string;
  practical: string;
  repair: string;
  repairFormula?: string;
  repairProofFormula?: string;
  implementation: string;
  caveats: string[];
  correctionSearch: string;
  correctionSearchDate?: string;
  sources: { label: string; url: string; location?: string }[];
  auditId: string;
  primaryUrl: string;
  citationCount?: number;
  citationUrl?: string;
  citationDate?: string;
  paperSummary: string;
  theoryRole: string;
  selection?: "user-nominated";
  reproductionUrl?: string;
  reviewDate?: string;
  severity?: Severity | null;
  issueTypes?: string[];
};

export const statusLabels = {
  counterexample: "Counterexample",
  addressed: "Addressed",
  finding: "Finding",
  "no-error": "No issues found",
  unresolved: "Unresolved",
};

export type FindingSummary = Omit<Pick<Finding, "slug" | "title" | "issueTitle" | "year" | "category" | "status" | "plainExplanation" | "primaryUrl" | "citationCount" | "citationUrl" | "citationDate" | "collection">, "status"> & {
  status: Finding["status"] | "addressed" | "finding" | "no-error" | "unresolved";
  authors?: string[];
  classifications?: string[];
  noteUrl?: string;
  reviewStage?: string;
  severity?: Severity | null;
  issueTypes?: string[];
  verificationStatus?: string;
  addressingSources?: { label: string; url: string }[];
  resolutionType?: string;
};
export function summarizeFinding({ slug, title, issueTitle, year, category, status, plainExplanation, primaryUrl, citationCount, citationUrl, citationDate, collection, severity, issueTypes }: Finding): FindingSummary {
  return { slug, title, issueTitle, year, category, status, plainExplanation, primaryUrl, citationCount, citationUrl, citationDate, collection, severity, issueTypes };
}

export const tagLabels = { "neurips-2026": "NeurIPS 2026" };

export const classificationLabels = {
  fatal_to_main_theorem: "Critical",
  fatal_to_lemma_only: "Lemma error",
  statement_false: "False statement",
  repairable_gap: "Repairable gap",
  cosmetic: "Cosmetic",
  ungraded_issue: "Unrated issue",
  addressed: "Addressed",
  no_error_found: "No issues found",
  unresolved: "Unresolved",
};
export const severityLabels = {
  no_issues: "No issues found",
  fixed: "Fixed",
  minor_cosmetic: "Minor / cosmetic",
  repairable: "Repairable",
  major: "Major",
  critical: "Critical",
};
export type Severity = keyof typeof severityLabels;
export const severities = Object.keys(severityLabels) as Severity[];
/** One definition per grade, shared by the methodology guide and the scale on reports. */
export const severityDescriptions: Record<Severity, string> = {
  no_issues: "No error identified in the checked claim. This includes concerns already resolved by the paper or its supplement.",
  fixed: "An error the authors corrected in a later version of the paper or in their own supplement. The report keeps the original analysis for reference.",
  minor_cosmetic: "Notation or presentation needs correction without changing the mathematical result.",
  repairable: "A proof gap or missing condition that a specific correction closes; the result holds once it is applied.",
  major: "A lemma or stated result fails as written, although the main theorem may survive. The report may still propose a corrected statement.",
  critical: "A central theoretical claim fails under its stated assumptions.",
};
export const defaultSeverities = severities.filter(value => value !== "no_issues");
/** Grades on the error scale; "fixed" sits outside it. */
export const scaleSeverities = severities.filter(value => value !== "fixed");
export const issueTypeLabels: Record<string, string> = {
  lemma_error: "Lemma error", false_statement: "False statement", proof_gap: "Proof gap",
  missing_assumption: "Missing assumption", incorrect_bound: "Incorrect bound",
  implementation_mismatch: "Code / theory mismatch", numerical_error: "Numerical error",
  notation: "Notation", unsupported_claim: "Unsupported claim",
  algorithm_specification: "Algorithm specification", calibration_error: "Calibration error",
  citation_hypothesis_mismatch: "Citation / hypothesis mismatch", complexity_error: "Complexity error",
  definition_ambiguity: "Ambiguous definition", definition_error: "Definition error",
  documentation_error: "Documentation error", formula_error: "Formula error",
  implementation_error: "Code error", interpretation_error: "Interpretation error",
  invalid_inference: "Invalid inference", invalid_reduction: "Invalid reduction",
  mathematical_error: "Mathematical error", reporting_ambiguity: "Ambiguous reporting",
  reporting_gap: "Reporting gap", reporting_inconsistency: "Reporting inconsistency",
  reporting_overstatement: "Overstated result",
};

export function findingSeverity(finding: FindingSummary): Severity | null {
  if (finding.severity !== undefined) return finding.severity;
  const legacy = finding.classifications ?? [];
  if (legacy.includes("fatal_to_main_theorem")) return "critical";
  if (legacy.some(value => ["fatal_to_lemma_only", "statement_false"].includes(value))) return "major";
  if (legacy.some(value => ["repairable_gap", "addressed"].includes(value))) return "repairable";
  if (legacy.includes("cosmetic")) return "minor_cosmetic";
  if (legacy.includes("no_error_found") || finding.status === "no-error") return "no_issues";
  if (finding.status === "counterexample") return "major";
  if (finding.status === "addressed") return "repairable";
  return null;
}

export function findingClassifications(finding: FindingSummary): (keyof typeof classificationLabels)[] {
  const values = finding.classifications ?? [{ counterexample: "statement_false", addressed: "addressed", finding: "unresolved", "no-error": "no_error_found", unresolved: "unresolved" }[finding.status]];
  const known = (Object.keys(classificationLabels) as (keyof typeof classificationLabels)[]).filter(value => values.includes(value));
  return known.length > 1 ? known.filter(value => value !== "no_error_found") : known;
}

const normalizeSearch = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");

export function filterFindings(findings: FindingSummary[], { query, category, status = "all", tag, sort, selectedSeverities = defaultSeverities }: { query: string; category: string; status?: string; tag: string; sort: string; selectedSeverities?: string[] }) {
  const includeBibliographic = severities.every(value => selectedSeverities.includes(value));
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return findings.filter(f => {
    const severity = findingSeverity(f);
    const text = normalizeSearch(`${f.title} ${(f.authors ?? []).join(" ")} ${f.category} ${f.year} ${f.primaryUrl} ${severity === null ? "" : `${f.issueTitle} ${f.plainExplanation}`}`);
    return (category === "All fields" || f.category === category) &&
      (status === "all" || f.status === status) &&
      (tag === "all" || (tag === "others" ? f.collection !== "neurips-2026" : f.collection === tag)) &&
      (severity === null ? includeBibliographic : selectedSeverities.includes(severity)) &&
      terms.every(term => text.includes(term));
  }).sort((a, b) => {
    if (sort === "index") return 0;
    const titleOrder = a.title.localeCompare(b.title, "en") || a.slug.localeCompare(b.slug, "en");
    if (sort === "newest") return b.year - a.year || titleOrder;
    if (sort === "oldest") return a.year - b.year || titleOrder;
    if (sort === "most-cited" || sort === "least-cited") {
      if (a.citationCount == null) return b.citationCount == null ? titleOrder : 1;
      if (b.citationCount == null) return -1;
      return (sort === "most-cited" ? b.citationCount - a.citationCount : a.citationCount - b.citationCount) || titleOrder;
    }
    return titleOrder;
  });
}
