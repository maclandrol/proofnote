import "./check-explorer.mjs";
import "./check-reading-layout.mjs";
import "./check-public-records.mjs";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import katex from "katex";
import ts from "typescript";
import vm from "node:vm";

const read = p => readFileSync(p, "utf8");
// Exercise the actual reader schema/gate without starting the app or fetching data.
const readerFile = "src/components/proof-atlas/ReviewedPaper.tsx";
const readerAst = ts.createSourceFile(readerFile, read(readerFile), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const guardNames = new Set(["isObject", "stringArray", "optionalGrade", "isCheckedSource", "isReview", "hasValidDuplicateTargets", "isPublishedCheck"]);
const guardSource = readerAst.statements.filter(node =>
  ts.isFunctionDeclaration(node) && guardNames.has(node.name?.text)
  || ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => guardNames.has(declaration.name.getText(readerAst)))
).map(node => node.getText(readerAst)).join("\n");
const readerGuards = vm.runInNewContext(ts.transpileModule(`${guardSource}\n({ isReview, isPublishedCheck })`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
const keptCheck = { id: "kept", location: "Lemma", claim: "Claim", explanation: "Explanation", verdict: "confirmed", impactSeverity: "major", verificationStatus: "confirmed_but_rescoped" };
const duplicateCheck = { ...keptCheck, id: "duplicate", duplicateOf: keptCheck.id };
const duplicateReview = { slug: "duplicate-fixture", title: "Paper", category: "Theory", status: "counterexample", primaryUrl: "https://example.org/paper", reviewStage: "Selected-claim review", summary: "", year: 2026, classifications: [], checks: [duplicateCheck, keptCheck], sources: [] };
assert(readerGuards.isReview(duplicateReview, duplicateReview.slug));
for (const originalIndex of [-1, "6", null]) assert(!readerGuards.isReview({ ...duplicateReview, checks: [{ ...keptCheck, originalIndex }] }, duplicateReview.slug));
assert(readerGuards.isReview({ ...duplicateReview, checks: [{ ...keptCheck, originalIndex: 6 }] }, duplicateReview.slug));
assert.deepEqual(duplicateReview.checks.filter(readerGuards.isPublishedCheck), [keptCheck]);
assert.equal(duplicateReview.checks.length, 2);
for (const checks of [
  [{ ...duplicateCheck, duplicateOf: "duplicate" }, keptCheck],
  [{ ...duplicateCheck, duplicateOf: "another-paper" }, keptCheck],
  [duplicateCheck, { ...keptCheck, duplicateOf: "duplicate" }],
  [duplicateCheck, { ...keptCheck, reviewScope: "outside_mathematics" }],
  [{ ...duplicateCheck, impactSeverity: "repairable" }, keptCheck],
  [{ ...duplicateCheck, verificationStatus: "confirmed" }, keptCheck],
]) assert(!readerGuards.isReview({ ...duplicateReview, checks }, duplicateReview.slug));
const source = read("src/data/proof-atlas.json");
const records = JSON.parse(source);
// Review records kept outside the published repository are checked only where present.
const local = path => existsSync(path) ? JSON.parse(read(path)) : null;
const decisions = local("data/review-decisions.json");
const withdrawn = local("data/withdrawn.json") ?? [];
if (decisions) assert.equal(records.length, decisions.summary.detailedRetained);
assert.equal(new Set(records.map(r => r.slug)).size, records.length);
assert.equal(new Set(records.map(r => r.auditId)).size, records.length);
assert.equal(source, read("public/data/proof-atlas/findings.json"));
assert(!/\/Users\/|file:\/\/|localhost|TODO|TBD/.test(source));
let formulaCount = 0;
for (const r of records) {
  assert.match(r.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(r.status, "counterexample");
  for (const key of ["paperSummary", "theoryRole", "primaryUrl", "citationUrl", "title", "issueTitle", "originalClaim", "location", "version", "plainExplanation", "counterexample", "impact", "practical", "repair", "implementation", "correctionSearch"]) {
    assert.equal(typeof r[key], "string", `${r.slug}: ${key}`);
    assert(r[key].trim().length > 0, `${r.slug}: empty ${key}`);
  }
  assert(r.steps.length >= 3 && r.assumptions.length >= 1 && r.sources.length >= 1);
  for (const s of r.steps) assert(s.text?.length > 10);
  for (const s of r.sources) assert.equal(new URL(s.url).protocol, "https:");
  for (const tex of [r.formula, r.witnessFormula, r.repairFormula, r.repairProofFormula, ...r.steps.map(s => s.formula)].filter(Boolean)) {
    katex.renderToString(tex, { throwOnError: true, strict: "error", trust: false });
    formulaCount++;
  }
  const path = `.next/server/app/${r.slug}.html`;
  assert(existsSync(path), `Missing generated route: ${r.slug}`);
  const html = read(path);
  for (const section of ["context", "plain", "claim", "reasoning", "impact", "sources"]) {
    assert.equal((html.match(new RegExp(`id="${section}"`, "g")) || []).length, 1, `${r.slug}: ${section}`);
  }
  assert(html.includes("katex"));
  assert(!html.includes('class="katex-error"'));
  assert(/<details\b[^>]*class="pa-finding pa-editorial-finding(?: [^"]*)?"/.test(html), `Finding must collapse: ${r.slug}`);
  assert(html.includes(`/${r.slug}`));
  assert(html.includes(r.reproductionUrl ?? "/data/proof-atlas/reproduce.py"));
  assert(!html.includes("Download the assessment record"), `${r.slug}: internal assessment download shown`);
}
const dps = records.find(r => r.auditId === "IG045");
assert(dps.steps.some(s => s.text.includes("0.2") || s.formula?.includes("0.2")), "DPS must use the signed-gap witness");
const numerics = records.find(r => r.auditId === "IG023");
assert(numerics.repairFormula, "Do not drop the corrected skew-scale bound");
console.log(`PASS: ${records.length} generated case pages, ${formulaCount} formulas, source URLs, section anchors, public-data parity and witness-specific safeguards.`);

const addressed = JSON.parse(read("src/data/proof-atlas-addressed.json"));
if (decisions) assert.equal(addressed.length, decisions.summary.addressedRetained);
assert.equal(read("src/data/proof-atlas-addressed.json"), read("public/data/proof-atlas/addressed.json"));
assert.equal(JSON.parse(read("src/data/proof-atlas-corpus.json")).paperCount, 336);
if (decisions) assert.equal(new Set([...records, ...addressed].map(r => r.auditId)).size, decisions.summary.totalRetained);
for (const r of [...records, ...addressed]) {
  assert(Number.isInteger(r.citationCount) && r.citationCount >= 0);
  assert(r.citationCount >= 300 || r.selection === "user-nominated");
  for (const url of [r.primaryUrl, r.citationUrl, ...(r.addressingSources || []).map(s => s.url)]) assert.equal(new URL(url).protocol, "https:");
}
for (const r of addressed) {
  assert.equal(r.status, "addressed");
  assert(r.addressingSources.length > 0);
  assert(existsSync(`.next/server/app/${r.slug}.html`));
}
console.log(`PASS: 336 screened papers, ${records.length + addressed.length} unique indexed papers, dated citations and source-linked addressed entries.`);

for (const r of addressed) assert(["later-version", "different-work", "separate-discussion", "separate-code-source"].includes(r.addressingRelationship));

const additional = local("data/additional-reviews.json");
const corpus = JSON.parse(read("src/data/proof-atlas-corpus.json"));
assert.equal(corpus.paperCount, corpus.initialPaperCount + corpus.additionalPaperCount);
if (additional) {
  assert.equal(additional.length, corpus.additionalPaperCount);
  assert.equal(new Set(additional.map(r => r.arxivId)).size, additional.length);
}
for (const r of records.filter(r => r.selection === "user-nominated")) {
  if (additional) assert(additional.some(a => a.publishedSlug === r.slug));
  assert(existsSync(`public${r.reproductionUrl}`));
}

for (const w of withdrawn) {
  assert(![...records, ...addressed].some(r => r.auditId === w.auditId || r.slug === w.slug));
  assert(!existsSync(`.next/server/app/${w.slug}.html`), `Withdrawn route regenerated: ${w.slug}`);
}
console.log(`PASS: ${withdrawn.length} withdrawn entries absent from routes and publication data.`);

const neuripsSource = read("data/neurips-2026.json");
const neurips = JSON.parse(neuripsSource);
const aero = neurips.find(r => r.auditId === "SUS26-153606-01");
assert(read(`.next/server/app/${aero.slug}.html`).includes('data-illustration="contracting-bound"'));
assert(Math.exp(-2) < 4 && Math.abs(Math.exp(-2) - 0.1353352832366127) < 1e-15);
assert(Math.exp(-1) < 2.25 && Math.abs(Math.exp(-1) - 0.36787944117144233) < 1e-15);
const neuripsAddressedSource = read("data/neurips-2026-addressed.json");
const neuripsAddressed = JSON.parse(neuripsAddressedSource);
assert.equal(neuripsAddressedSource, read("src/data/proof-atlas-neurips-2026-addressed.json"));
assert.equal(neuripsAddressedSource, read("public/data/proof-atlas/neurips-2026-addressed.json"));
for (const r of neuripsAddressed) {
  assert.equal(r.status, "addressed");
  assert.equal(r.collection, "neurips-2026");
  const html = read(`.next/server/app/${r.slug}.html`);
  assert(html.includes("NeurIPS 2026") && html.includes(r.plainExplanation));
  if (r.resolutionType === "qualification") {
    assert(html.includes("Claim and author qualification") && html.includes("Author qualification"));
    assert(!html.includes("Issue and subsequent treatment") && !html.includes("Implementation treatment"));
  }
  assert(r.addressingSources.length > 0);
  if (r.citationCount == null) {
    const start = html.indexOf('<article class="pa-article');
    assert(start >= 0);
    assert(!html.slice(start, html.indexOf("</article>", start)).includes('class="pa-citation"'));
  }
  for (const s of r.addressingSources) assert.equal(new URL(s.url).protocol, "https:");
}
assert.equal(neuripsSource, read("src/data/proof-atlas-neurips-2026.json"));
assert.equal(neuripsSource, read("public/data/proof-atlas/neurips-2026.json"));
assert.equal(new Set([...records, ...addressed, ...neurips, ...neuripsAddressed].map(r => r.slug)).size, records.length + addressed.length + neurips.length + neuripsAddressed.length);
assert.equal(new Set([...records, ...addressed, ...neurips, ...neuripsAddressed].map(r => r.auditId)).size, records.length + addressed.length + neurips.length + neuripsAddressed.length);
assert(!/\/Users\/|file:\/\/|localhost|TODO|TBD/.test(neuripsSource));
for (const r of neurips) {
  assert.equal(r.collection, "neurips-2026");
  assert.equal(r.status, "counterexample");
  const html = read(`.next/server/app/${r.slug}.html`);
  const header = html.match(/<header class="pa-article-header">([\s\S]*?)<\/header>/)?.[1];
  assert(header, `Missing assessment header: ${r.slug}`);
  assert(header.includes("NeurIPS 2026"));
  if (r.citationCount == null) assert(!header.includes('class="pa-citation"'), `Fabricated citation count: ${r.slug}`);
  for (const section of ["context", "plain", "claim", "reasoning", "impact", "sources"]) assert.equal((html.match(new RegExp(`id="${section}"`, "g")) || []).length, 1);
  for (const tex of [r.formula, r.witnessFormula, r.repairFormula, r.repairProofFormula, ...r.steps.map(s => s.formula)].filter(Boolean)) katex.renderToString(tex, { throwOnError: true, strict: "error", trust: false });
  assert(existsSync(`public${r.reproductionUrl}`), `${r.slug}: missing reproductionUrl`);
  assert(html.includes(`href="${r.reproductionUrl}"`), `${r.slug}: unlinked reproductionUrl`);
  assert(html.replace(/<!--[\s\S]*?-->/g, "").includes("Correction search"));
}
for (const r of [...records, ...addressed, ...neurips, ...neuripsAddressed]) {
  const html = read(`.next/server/app/${r.slug}.html`);
  assert.match(html, /<article class="pa-article pa-paper-report\b/, `${r.slug}: shared reader layout`);
  assert(!html.includes('class="pa-explorer pa-compact"'), `${r.slug}: unrelated catalogue in the report sidebar`);
  assert.match(html, /class="pa-mobile-outline"/, `${r.slug}: mobile report navigation`);
  const outline = html.match(/<nav class="pa-report-outline"[\s\S]*?<\/nav>/)?.[0];
  assert(outline, `${r.slug}: shared report outline`);
  for (const [, anchor] of outline.matchAll(/href="#([^"]+)"/g)) {
    assert.equal((html.match(new RegExp(`id="${anchor}"`, "g")) ?? []).length, 1, `${r.slug}: outline target ${anchor}`);
  }
}
const neuripsPage = read(".next/server/app/neurips-2026.html");
assert.equal(new URL(neuripsPage.match(/<link rel="canonical" href="([^"]+)"/)?.[1]).pathname, "/");
assert(neuripsPage.includes('href="/contribute"'));
assert(read(".next/server/app/contribute.html").includes("/data/proof-atlas/research-archive.zip"));
const home = read(".next/server/app/index.html");
const scanned = JSON.parse(read("data/scanned-papers.json"));
for (const html of [home, neuripsPage]) {
  assert.equal((html.match(/<article\b/g) || []).length, 10, "Initial paper rows must render before hydration");
  assert(!html.includes("Loading papers"), "Static paper list replaced by a loading placeholder");
  const nav = html.match(/<nav aria-label="Proof Notes"[\s\S]*?<\/nav>/)?.[0];
  assert(nav);
  assert(!/NeurIPS 2026|Methodology|Data &amp; contribute/.test(nav), "Removed top-level tabs returned");
  assert(!html.includes("Original collection") && !html.includes("original corpus"));
  assert(html.includes(scanned.totalScanned.toLocaleString("en-US")) && html.includes("papers scanned"), "Full scanned total omitted");
  assert(html.includes("Automated mathematical claim checking with frontier LLMs."));
  assert(!html.includes("Checking proofs in machine learning."));
  assert(html.includes('aria-label="Paper collection"') && html.includes('value="others"'));
  assert.match(html, /<button[^>]*class="pa-severity-trigger"[^>]*aria-expanded="false"[^>]*aria-controls="[^"]+"[^>]*aria-label="Finding severity: 5 of 6 selected"/);
}
assert.equal(scanned.papers.length, 5212);
assert.deepEqual(JSON.parse(read("src/data/proof-atlas-scan-counts.json")), { totalScanned: scanned.totalScanned, collections: scanned.collections });
assert(existsSync(".next/server/app/review.html"));
for (const r of [...records, ...addressed, ...neurips, ...neuripsAddressed]) assert(scanned.papers.some(paper => paper.slug === r.slug), `Catalogue omits ${r.slug}`);
console.log(`PASS: ${scanned.totalScanned.toLocaleString("en-US")} scanned papers, collection/category filters, preserved detailed notes and shared review reader.`);

for (const route of ["index", "contribute", "methodology", "neurips-2026", ...records.map(r => r.slug), ...addressed.map(r => r.slug), ...neurips.map(r => r.slug), ...neuripsAddressed.map(r => r.slug)]) {
  const html = read(`.next/server/app/${route}.html`);
  for (const [, href] of html.matchAll(/href="(\/data\/proof-atlas\/[^"?#]+)"/g)) {
    assert(existsSync(`public${href}`), `Missing download on ${route}: ${href}`);
  }
  assert(!/latest AI recheck|Latest recheck|Claim-by-claim recheck|A second, stricter pass/.test(html), `Process history leaked into assessment copy: ${route}`);
}
console.log("PASS: assessment pages use current wording and all local downloads exist.");

for (const [id, attribute, kind] of [
  ["E-ARC-15", "data-witness", "jump"], ["IG007", "data-witness", "infovae"],
  ["IG045", "data-witness", "dps"], ["E-RL-05", "data-witness", "cql"],
  ["IG023", "data-witness", "numerics"],
  ["IARC-073", "data-illustration", "local-iterates"],
  ["IR009", "data-illustration", "bear-actions"],
  ["NOM-2502.01954", "data-illustration", "belief-conditioning"],
]) {
  const record = records.find(r => r.auditId === id);
  assert(record, `Illustration attached to an excluded claim: ${id}`);
  const html = read(`.next/server/app/${record.slug}.html`);
  assert(html.includes(`${attribute}="${kind}"`), `Missing illustration on ${record.slug}`);
  assert(html.includes('role="img"'), `Missing accessible graphic on ${record.slug}`);
  if (attribute === "data-witness" || kind === "local-iterates") assert(html.includes('type="range"'));
}
console.log("PASS: source-based claim illustrations and existing interactive examples render.");
