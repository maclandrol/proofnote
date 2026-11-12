import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { publicIndex, publicReview } from "./public-records.mjs";

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const index = read("data/scanned-papers.json");
const overrides = read("data/reader-copy.json");
const records = Object.assign({}, ...readdirSync(new URL("../data/reviews/", import.meta.url)).filter(file => /^\d+\.json$/.test(file)).map(file => read(`data/reviews/${file}`)));
const original = JSON.stringify(records);
assert.equal(Object.keys(records).length, 5212);
assert.equal(Object.values(records).reduce((count, paper) => count + paper.checks.length, 0), 8724);
assert.equal(overrides.length, 8);
assert.equal(new Set(overrides.map(item => item.checkId)).size, 6);
const projected = Object.fromEntries(Object.entries(records).map(([slug, review]) => [slug, publicReview(review, overrides)]));
for (const file of readdirSync(new URL("../data/reviews/", import.meta.url)).filter(file => /^\d+\.json$/.test(file))) {
  const source = read(`data/reviews/${file}`);
  assert.deepEqual(read(`public/data/proof-atlas/reviews/${file}`), Object.fromEntries(Object.keys(source).map(slug => [slug, projected[slug]])), `Stale public shard: ${file}`);
}
let generic = 0, positive = 0, published = 0;
const publicCheckFields = new Set(["id", "location", "claim", "verdict", "explanation", "demonstration", "repair", "scope", "title", "whyItMatters", "impactSeverity", "issueTypes", "claimContext", "claimFormula", "contextBefore", "contextAfter", "checkedLocation", "checkedSource", "relatedSources", "originalIndex"]);
const scienceFields = ["claim", "claimContext", "claimFormula", "contextBefore", "contextAfter", "explanation", "demonstration", "repair", "scope", "title", "whyItMatters", "impactSeverity", "issueTypes", "location", "checkedLocation", "checkedSource", "relatedSources"];
for (const [slug, review] of Object.entries(projected)) {
  const raw = records[slug];
  for (const key of ["slug", "title", "year", "category", "status", "primaryUrl", "version", "firstUploadedAt", "latestUploadedAt", "collection", "severity", "issueTypes", "sources", "paperSummary", "theoryRole"]) assert.deepEqual(review[key], raw[key], `${slug}: ${key}`);
  assert.deepEqual(review.classifications, raw.severity ? [raw.severity] : []);
  assert.equal(review.reviewStage, "");
  assert.equal(review.summary, "");
  for (const key of ["verificationStatus", "sourceSha256", "acceptedVersionComparisonRequired", "publicationDisposition", "auditIds"]) assert.ok(!Object.hasOwn(review, key), `${slug}: private ${key}`);
  if (raw.severity === null) assert.deepEqual(review.checks, []);
  const expected = raw.severity === null ? [] : raw.checks.filter(check => {
    const verdict = check.verificationStatus ?? check.verdict;
    return check.reviewScope !== "outside_mathematics" && check.duplicateOf === undefined
      && (["refuted", "no_error_found", "resolved_in_original"].includes(verdict)
        || check.impactSeverity != null && ["confirmed", "confirmed_but_rescoped", "addressed"].includes(verdict));
  });
  assert.deepEqual(review.checks.map(check => check.id), expected.map(check => check.id), slug);
  assert.equal(new Set(review.checks.map(check => check.originalIndex)).size, review.checks.length);
  for (const check of review.checks) {
    published++;
    const source = raw.checks[check.originalIndex];
    for (const key of ["id", "location", "claim", "verdict", "explanation"]) assert.equal(typeof check[key], "string", `${check.id}: required ${key}`);
    assert.equal(source.id, check.id, `${slug}: stable source anchor`);
    assert.equal(check.verdict, source.verificationStatus ?? source.verdict);
    for (const key of Object.keys(check)) assert.ok(publicCheckFields.has(key), `${check.id}: private ${key}`);
    if (["confirmed", "confirmed_but_rescoped", "addressed"].includes(check.verdict)) {
      positive++;
      assert.ok(check.claimContext, `${check.id}: source context missing`);
      for (const key of scienceFields.filter(key => key !== "claim")) assert.deepEqual(check[key], source[key], `${check.id}: changed ${key}`);
      assert.equal(check.claim, check.claimContext);
    } else if (check.verdict === "no_error_found" && !source.claimContext) {
      generic++;
      assert.equal(check.explanation, "No mathematical error was identified in the statements screened.");
      assert.equal(check.claim, "");
      assert.equal(check.location, source.checkedLocation ?? "");
      for (const key of ["title", "demonstration", "scope", "repair", "whyItMatters", "contextBefore", "contextAfter"]) assert.ok(!Object.hasOwn(check, key));
      assert.doesNotMatch(JSON.stringify(check), /previous first-pass reviewer|GPT-6|source_gap|blocks_screening|"claim":"true"/i);
    } else {
      for (const key of scienceFields.filter(key => key !== "claim")) {
        const override = overrides.find(item => item.checkId === check.id && item.field === key);
        assert.deepEqual(check[key], override ? override.after : source[key], `${check.id}: changed ${key}`);
      }
      assert.equal(check.claim, check.claimContext ?? "");
    }
    assert.deepEqual(check.checkedSource, source.checkedSource);
  }
}
assert.equal(published, 6547);
assert.equal(positive, 4125);
assert.equal(generic, 1970);
for (const override of overrides) {
  const review = Object.values(records).find(paper => paper.checks.some(check => check.id === override.checkId));
  const source = review.checks.find(check => check.id === override.checkId);
  assert.equal(source[override.field], override.before);
  assert.ok(["refuted", "no_error_found", "resolved_in_original"].includes(source.verificationStatus ?? source.verdict));
  assert.equal(projected[review.slug].checks.find(check => check.id === override.checkId)[override.field], override.after);
  const changed = structuredClone(review);
  changed.checks.find(check => check.id === override.checkId)[override.field] += " changed";
  assert.throws(() => publicReview(changed, overrides), /Public copy source changed/);
  assert.throws(() => publicReview(review, [{ ...override, field: "claim" }]), /Unsupported public copy field/);
}
const publicPapers = publicIndex(index, projected);
assert.deepEqual(read("public/data/proof-atlas/scanned-papers.json"), publicPapers, "Stale public index");
assert.equal(publicPapers.papers.length, 5212);
assert.deepEqual(publicPapers.papers.map(paper => paper.slug), index.papers.map(paper => paper.slug));
for (const key of ["totalScanned", "collections", "severities", "defaultVisible"]) assert.deepEqual(publicPapers[key], index[key]);
assert.ok(!Object.hasOwn(publicPapers, "awaitingVerification"));
const selected = index.papers.filter(paper => !paper.noteUrl);
assert.equal(selected.length, 47);
for (const [position, paper] of publicPapers.papers.entries()) {
  const source = index.papers[position];
  for (const key of ["slug", "title", "year", "category", "status", "primaryUrl", "noteUrl", "collection", "citationCount", "citationUrl", "latestUploadedAt", "severity", "issueTypes"]) assert.deepEqual(paper[key], source[key], `${paper.slug}: index ${key}`);
  if (source.severity === null) {
    assert.equal(paper.issueTitle, source.title);
    assert.equal(paper.plainExplanation, "");
  } else if (source.severity !== "no_issues" || !source.noteUrl) {
    assert.equal(paper.issueTitle, source.issueTitle);
    assert.equal(paper.plainExplanation, source.plainExplanation);
  } else {
    assert.equal(paper.issueTitle, source.title);
    assert.equal(paper.plainExplanation, projected[paper.slug].checks.find(check => check.explanation.trim()).explanation);
  }
}
assert.equal(JSON.stringify(records), original, "Public projection mutated canonical records");
const fixture = {
  ...Object.values(records)[0], severity: "major", checks: [
    { id: "outside", verdict: "confirmed", impactSeverity: "major", reviewScope: "outside_mathematics", explanation: "PRIVATE_OUTSIDE" },
    { id: "unknown", verdict: "unclear", impactSeverity: "major", explanation: "PRIVATE_UNKNOWN" },
    { id: "duplicate", verdict: "confirmed", impactSeverity: "major", duplicateOf: "positive", explanation: "PRIVATE_DUPLICATE" },
    { id: "generic", verdict: "no_error_found", claim: "true", location: "PRIVATE_LOCATION", title: "PRIVATE_READING_TITLE", explanation: "PRIVATE_READING_LOG", demonstration: "PRIVATE_RUN_LOG" },
    { id: "refuted", verdict: "refuted", claim: "PRIVATE_RAW_CLAIM", location: "Lemma 1", explanation: "The missing condition is supplied in the lemma.", demonstration: "x=1", repair: "Not needed." },
    { id: "positive", verdict: "unclear", verificationStatus: "confirmed_but_rescoped", impactSeverity: "major", claimContext: "x>0", claimFormula: "x>0", explanation: "x=-1 is permitted.", verificationNote: "PRIVATE_NOTE", sourceSha256: "PRIVATE_HASH" },
  ],
};
const result = publicReview(fixture);
assert.deepEqual(result.checks.map(check => check.originalIndex), [3, 4, 5]);
assert.deepEqual(result.checks.map(check => check.id), ["generic", "refuted", "positive"]);
assert.equal(result.checks[1].demonstration, "x=1");
assert.equal(result.checks[1].repair, "Not needed.");
assert.equal(result.checks[2].verdict, "confirmed_but_rescoped");
assert.doesNotMatch(JSON.stringify(result), /PRIVATE_/);
console.log(`PASS: ${Object.keys(projected).length} public papers; ${published} checks, ${positive} scientific findings and ${generic} concise no-issue assessments; eight guarded copy edits across six checks, 47 selected previews and stable anchors preserved.`);
