import assert from "node:assert/strict";

const noIssueVerdicts = new Set(["refuted", "no_error_found", "resolved_in_original"]);
const issueVerdicts = new Set(["confirmed", "confirmed_but_rescoped", "addressed"]);
const assessment = "No mathematical error was identified in the statements screened.";
const pick = (record, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(record, key)).map(key => [key, record[key]]));
const checkFields = ["id", "location", "claim", "explanation", "demonstration", "repair", "scope", "title", "whyItMatters", "impactSeverity", "issueTypes", "claimContext", "claimFormula", "contextBefore", "contextAfter", "checkedLocation", "checkedSource", "relatedSources", "fixedIn"];
const paperFields = ["slug", "title", "year", "category", "status", "primaryUrl", "version", "firstUploadedAt", "latestUploadedAt", "collection", "paperSummary", "theoryRole", "severity", "issueTypes", "sources", "fixedAt"];
const indexFields = ["slug", "title", "authors", "year", "category", "status", "issueTitle", "plainExplanation", "primaryUrl", "noteUrl", "collection", "citationCount", "citationUrl", "latestUploadedAt", "severity", "issueTypes", "fixedAt"];

export function publicReview(review, copyOverrides = []) {
  const checks = [];
  for (const [originalIndex, source] of review.checks.entries()) {
    const verdict = source.verificationStatus ?? source.verdict;
    if (review.severity === null || source.reviewScope === "outside_mathematics" || source.duplicateOf !== undefined
      || !(noIssueVerdicts.has(verdict) || source.impactSeverity != null && issueVerdicts.has(verdict))) continue;
    const check = { ...pick(source, checkFields), verdict, originalIndex };
    for (const override of copyOverrides.filter(item => item.checkId === source.id)) {
      assert.ok(["explanation", "claimContext", "scope"].includes(override.field), `Unsupported public copy field: ${source.id}`);
      assert.equal(source[override.field], override.before, `Public copy source changed: ${source.id}`);
      assert.equal(typeof override.after, "string");
      check[override.field] = override.after;
    }
    check.claim = check.claimContext ?? "";
    if (verdict === "no_error_found" && !source.claimContext) {
      check.explanation = assessment;
      check.location = source.checkedLocation ?? "";
      for (const key of ["title", "demonstration", "scope", "repair", "whyItMatters", "contextBefore", "contextAfter"]) delete check[key];
    }
    checks.push(check);
  }
  return {
    ...pick(review, paperFields),
    classifications: review.severity ? [review.severity] : [],
    reviewStage: "", summary: "", checks,
  };
}

export function publicIndex(index, publicReviews) {
  return {
    ...pick(index, ["totalScanned", "collections", "defaultVisible", "severities"]),
    papers: index.papers.map(source => {
      const review = publicReviews[source.slug];
      assert.ok(review, `Missing public review: ${source.slug}`);
      const paper = { ...pick(source, indexFields), classifications: review.classifications };
      if (source.severity === "no_issues" && source.noteUrl) {
        paper.issueTitle = source.title;
        paper.plainExplanation = review.checks.find(check => check.explanation.trim())?.explanation ?? assessment;
      } else if (source.severity === null) {
        paper.issueTitle = source.title;
        paper.plainExplanation = "";
      }
      return paper;
    }),
  };
}
