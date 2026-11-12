import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToString } from "react-dom/server";
import * as types from "../src/components/proof-atlas/types.ts";
const { severities, filterFindings, findingSeverity } = types;

const base = { year: 2026, issueTitle: "A bound", category: "Optimization", status: "counterexample", plainExplanation: "A feasible witness", primaryUrl: "https://example.org/paper" };
const entries = [
  { ...base, slug: "original", title: "Original", citationCount: 10 },
  { ...base, slug: "unknown-z", title: "Zeta", collection: "neurips-2026" },
  { ...base, slug: "zero", title: "Zero", collection: "neurips-2026", citationCount: 0 },
  { ...base, slug: "addressed", title: "Addressed", status: "addressed", citationCount: 20, collection: "neurips-2026" },
  { ...base, slug: "unknown-a", title: "Alpha", collection: "neurips-2026" },
];
const options = { query: "", category: "All fields", status: "all", tag: "all", sort: "index" };
const select = changes => filterFindings(entries, { ...options, ...changes }).map(f => f.slug);
assert.deepEqual(select({ tag: "neurips-2026", status: "counterexample", query: " FEASIBLE " }), ["unknown-z", "zero", "unknown-a"]);
assert.deepEqual(select({ status: "addressed" }), ["addressed"]);
assert.deepEqual(select({ tag: "neurips-2026", category: "Probability" }), []);
assert.deepEqual(select({ tag: "neurips-2026", category: "Optimization" }), ["unknown-z", "zero", "addressed", "unknown-a"]);
assert.deepEqual(select({ tag: "neurips-2026", status: "addressed" }), ["addressed"]);
assert.deepEqual(select({ tag: "original" }), []);
assert.deepEqual(select({ sort: "least-cited" }), ["zero", "original", "addressed", "unknown-a", "unknown-z"]);
assert.deepEqual(select({ sort: "most-cited" }), ["addressed", "original", "zero", "unknown-a", "unknown-z"]);
assert.deepEqual(select({}), ["original", "unknown-z", "zero", "addressed", "unknown-a"]);
console.log("PASS: combined tag/field/status/search filters, one shared index, citation zero versus missing counts and deterministic sorting.");

const authorPaper = { ...base, slug: "author-paper", title: "Learning Graph Models", authors: ["Clément Vignac", "Ada Lovelace", "Pierluca D Oro"], primaryUrl: "https://arxiv.org/abs/2301.12345" };
for (const query of ["Learning Graph Models", "clement", "VIGNAC", "Ada Lovelace", "lovelace graph", "Pierluca D'Oro", "graph-models", "2026", "2301.12345", "  graph   clement  "]) {
  assert.deepEqual(filterFindings([authorPaper], { ...options, query }).map(p => p.slug), [authorPaper.slug], `Search misses ${query}`);
}
assert.equal(filterFindings([authorPaper], { ...options, query: "graph unknown-author" }).length, 0);
assert.equal(filterFindings([authorPaper], { ...options, query: "clement", selectedSeverities: ["critical"] }).length, 0, "Author search preserves severity filters");
assert.equal(filterFindings([{ ...authorPaper, severity: null, issueTitle: "PRIVATE_ALLEGATION", plainExplanation: "PRIVATE_EXPLANATION" }], { ...options, query: "PRIVATE", selectedSeverities: severities }).length, 0, "Search does not expose unpublished assessment text");
console.log("PASS: paper titles, authors, accents, combined terms, year and paper IDs are searchable without changing severity or publication filters.");


const classified = [
  { ...base, slug: "multi", title: "Multiple findings", status: "finding", classifications: ["fatal_to_lemma_only", "repairable_gap"], collection: "neurips-2026" },
  { ...base, slug: "clean", title: "No issue", status: "no-error", classifications: ["no_error_found"], collection: "neurips-2026" },
  { ...base, slug: "cosmetic", title: "Cosmetic", status: "finding", classifications: ["cosmetic"] },
  { ...base, slug: "pending", title: "Bibliographic paper", issueTitle: "Unpublished allegation", plainExplanation: "Unpublished explanation", status: "unresolved", classifications: ["unresolved"], severity: null, issueTypes: ["false_statement"] },
];
const classifiedSelect = changes => filterFindings(classified, { ...options, ...changes }).map(f => f.slug);
assert.deepEqual(classifiedSelect({}), ["multi", "cosmetic"]);
assert.deepEqual(classifiedSelect({ selectedSeverities: severities }), ["multi", "clean", "cosmetic", "pending"]);
assert.deepEqual(classifiedSelect({ selectedSeverities: ["no_issues"] }), ["clean"]);
assert.deepEqual(classifiedSelect({ selectedSeverities: ["repairable"] }), []);
assert.deepEqual(classifiedSelect({ selectedSeverities: ["major", "minor_cosmetic"] }), ["multi", "cosmetic"]);
assert.deepEqual(classifiedSelect({ selectedSeverities: [] }), []);
assert.deepEqual(classifiedSelect({ tag: "others" }), ["cosmetic"]);
assert.deepEqual(classifiedSelect({ selectedSeverities: severities, query: "Unpublished" }), [], "Hidden allegations are not searchable previews");
for (const severity of severities) assert.ok(!classifiedSelect({ selectedSeverities: [severity] }).includes("pending"));
assert.deepEqual(classifiedSelect({ tag: "neurips-2026", category: "Optimization", query: "multiple", selectedSeverities: ["major"], sort: "title" }), ["multi"]);
assert.equal(findingSeverity({ ...classified[0], severity: "repairable" }), "repairable");
assert.equal(findingSeverity({ ...classified[0], severity: null }), null);
assert.deepEqual(select({ tag: "others" }), ["original"]);
const clarified = Array.from({ length: 6 }, (_, i) => ({ ...base, slug: `clarified-${i}`, title: "Clarified in original", status: "no-error", classifications: ["no_error_found"] }));
assert.deepEqual([filterFindings(clarified, options).length, filterFindings(clarified, { ...options, selectedSeverities: severities }).length, filterFindings(clarified, { ...options, selectedSeverities: ["no_issues"] }).length], [0, 6, 6]);
const inventory = JSON.parse(readFileSync(new URL("../data/scanned-papers.json", import.meta.url), "utf8"));
assert.equal(inventory.totalScanned, 5212);
const catalogue = JSON.parse(readFileSync(new URL("../public/data/proof-atlas/catalogue.json", import.meta.url), "utf8"));
for (const paper of catalogue) {
  const source = inventory.papers.find(p => p.slug === paper.slug);
  assert.ok(Array.isArray(paper.authors) && paper.authors.length && paper.authors.every(name => typeof name === "string" && name.trim()), `${paper.slug}: missing author metadata`);
  assert.deepEqual(paper.authors, source.authors, `${paper.slug}: author metadata lost during public projection`);
}
assert.ok(filterFindings(catalogue, { ...options, query: "Keyulu Xu", selectedSeverities: severities }).some(p => p.title === "How Powerful are Graph Neural Networks?"));

assert.equal(filterFindings(inventory.papers, { ...options, selectedSeverities: severities }).length, inventory.totalScanned);
assert.ok(filterFindings(inventory.papers, options).every(paper => findingSeverity(paper) !== null));
assert.ok(filterFindings(inventory.papers, { ...options, selectedSeverities: ["no_issues"] }).every(paper => findingSeverity(paper) === "no_issues"));
console.log(`PASS: five exclusive grades, bibliographic-only inclusion under Select all, and the complete ${inventory.totalScanned.toLocaleString("en-US")}-paper inventory.`);

const require = createRequire(import.meta.url);
const navigation = { exports: {} };
const navigationSource = readFileSync(new URL("../src/lib/catalogue-navigation.ts", import.meta.url), "utf8");
const navigationCode = ts.transpileModule(navigationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
runInNewContext(navigationCode, { module: navigation, exports: navigation.exports, require: () => types, URLSearchParams, URL });
const { catalogueFilters, catalogueHref, reportHref } = navigation.exports;
assert.equal(catalogueHref("q=a+b&tag=others&field=Optimization&severity=all&sort=title&page=2&redirect=https://evil.example"), "/?q=a+b&tag=others&field=Optimization&severity=all&sort=title&page=2");
assert.equal(catalogueHref("tag=unknown&severity=bogus&sort=bogus&page=-2"), "/");
assert.equal(catalogueHref("severity=none"), "/?severity=none");
assert.equal(catalogueHref("severity=major,major,unknown"), "/?severity=major");
assert.equal(catalogueHref("severity=all"), "/?severity=all");
assert.equal(catalogueFilters("page=1.2").page, 1);
assert.equal(catalogueFilters("page=99999999999999999").page, 1);
assert.equal(catalogueFilters("severity=none").selectedSeverities.length, 0);
assert.equal(catalogueFilters("severity=all").selectedSeverities.length, 6);
assert.equal(reportHref({ slug: "paper", noteUrl: "/review?paper=id" }, "q=a+b&severity=major&page=2"), "/review?paper=id&q=a+b&severity=major&page=2");
for (const noteUrl of ["https://evil.example", "//evil.example", "/\\evil.example"]) assert.equal(reportHref({ slug: "safe", noteUrl }), "/safe");
let queryString = null;
const compiled = { exports: {} };
const dependencies = {
  "../../lib/catalogue-navigation": navigation.exports,
  "next/navigation": { useSearchParams: () => { if (queryString === null) throw new Promise(() => {}); return new URLSearchParams(queryString); } },
  "next/link": ({ href, children, ...props }) => React.createElement("a", { ...props, href: typeof href === "string" ? href : href.pathname }, children),
  "./types": types,
  "./Citation": { Citation: () => null },
  "./RichText": { InlineText: ({ text }) => text },
};
const source = readFileSync(new URL("../src/components/proof-atlas/Explorer.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
runInNewContext(code, { module: compiled, exports: compiled.exports, require: name => dependencies[name] ?? require(name), URLSearchParams });
const { Explorer } = compiled.exports;
const papers = Array.from({ length: 25 }, (_, i) => ({ ...base, slug: `paper-${i}`, title: `Paper ${String(i).padStart(2, "0")}`, noteUrl: `/reviewed/paper-${i}`, ...(i < 4 ? { collection: "neurips-2026" } : {}) }));
function render(query, props = {}) {
  queryString = query;
  const html = renderToString(React.createElement(Explorer, { findings: papers, ...props }));
  return html.slice(html.indexOf('<div class="pa-explorer')).replace(/<!--\/\$-->$/, "");
}
const fallback = render(null);
assert.equal(fallback, render(""));
assert.equal((fallback.match(/<article /g) || []).length, 10);
assert.match(fallback, /href="\/reviewed\/paper-0"/);
assert.equal((render("tag=neurips-2026&field=Optimization").match(/<article /g) || []).length, 4);
assert.equal(render("tag=unknown&field=unknown"), render(""));
const compact = render(null, { compact: true, active: "paper-4" });
assert.equal((render("tag=neurips-2026", { compact: true, active: "paper-4" }).match(/<article /g) || []).length, 20, "Compact index ignores collection for its rows while preserving return context");
assert.equal((compact.match(/<article /g) || []).length, 20);
assert.match(compact, /Page <!-- -->1<!-- --> of <!-- -->2/);
assert.match(compact, /aria-current="page"/);
console.log("PASS: SSR fallback matches default body, query filters and note URLs work, compact index renders at most 20 rows with pagination.");

// Exercise the actual control handlers without a browser or a Next server.
const interactive = { exports: {} };
const effects = [];
const documentListeners = new Map();
const location = { pathname: "/", search: "" };
const historyEntries = ["/"];
let historyIndex = 0;
const history = {
  pushState(_state, _title, href) { historyEntries.splice(++historyIndex); historyEntries.push(href); navigate(href); },
  replaceState(_state, _title, href) { historyEntries[historyIndex] = href; navigate(href); },
  back() { if (historyIndex) navigate(historyEntries[--historyIndex]); },
  forward() { if (historyIndex + 1 < historyEntries.length) navigate(historyEntries[++historyIndex]); },
};
function navigate(href) { const url = new URL(href, "https://catalogue.invalid"); location.pathname = url.pathname; location.search = url.search; historyEntries[historyIndex] = href; }
let severityOpen = true;
const hookReact = {
  ...React,
  useRef: () => ({ current: null }),
  useMemo: compute => compute(),
  useId: () => "severity-test",
  useState: () => [severityOpen, value => { severityOpen = typeof value === "function" ? value(severityOpen) : value; }],
  useEffect: effect => { effects.push(effect); },
};
runInNewContext(`${code}\nexports.ExplorerBody = ExplorerBody;`, {
  module: interactive,
  exports: interactive.exports,
  require: name => name === "react" ? hookReact : dependencies[name] ?? require(name),
  URLSearchParams,
  window: { location, history },
  document: {
    addEventListener: (type, listener) => documentListeners.set(type, listener),
    removeEventListener: (type, listener) => { if (documentListeners.get(type) === listener) documentListeners.delete(type); },
  },
});
function body(props = {}) {
  effects.length = 0;
  return interactive.exports.ExplorerBody({ findings: classified, queryString: location.search, ...props });
}
function nodes(element, predicate) {
  const found = [];
  React.Children.forEach(element, child => {
    if (!React.isValidElement(child)) return;
    if (predicate(child)) found.push(child);
    found.push(...nodes(child.props.children, predicate));
  });
  return found;
}
const byClass = (element, name) => nodes(element, child => child.props.className === name)[0];
const checkboxes = element => nodes(element, child => child.type === "input" && child.props.type === "checkbox");
const controlText = element => React.Children.toArray(element.props.children).filter(child => typeof child === "string").join("");
const action = (element, label) => nodes(element, child => child.type === "button" && controlText(child) === label)[0];
let view = body();
const filters = React.Children.toArray(byClass(view, "pa-order-controls").props.children);
assert.deepEqual(filters.map(filter => filter.props.className), Array(4).fill("pa-select"));
assert.deepEqual(filters.map(filter => React.Children.toArray(filter.props.children)[0].props.children), ["Collection", "Severity", "Field", "Sort by"]);
const severityOptions = byClass(view, "pa-classification-options");
assert.equal(checkboxes(severityOptions).length, 6);
assert.deepEqual(checkboxes(severityOptions).map(input => input.props["aria-label"]), ["No issues found", "Fixed", "Minor / cosmetic", "Repairable", "Major", "Critical"]);
assert.deepEqual(nodes(severityOptions, child => child.type === "label").map(label => nodes(label, child => child.type === "span")[0].props.children), Object.values(types.severityLabels));
assert.equal(checkboxes(severityOptions)[0].props.checked, false, "No issues is unchecked by default");
assert.equal(checkboxes(view).length, 6, "Only the six severity choices are shown");
assert.equal(nodes(view, child => child.type === "select" && child.props["aria-label"] === "Paper collection")[0].props.value, "all");
action(view, "Select all").props.onClick();
view = body();
assert.ok(checkboxes(byClass(view, "pa-classification-options")).every(input => input.props.checked));
assert.equal(nodes(view, child => child.type === "article").length, 4);
const bibliographicCard = nodes(view, child => child.type === "article" && child.key === "pending")[0];
const bibliographicHtml = renderToString(bibliographicCard);
assert.match(bibliographicHtml, /Bibliographic paper/);
assert.doesNotMatch(bibliographicHtml, /Unpublished|Awaiting verification|No issues found|pa-issue-types|pa-paper-summary|pa-dot/);
action(view, "Clear").props.onClick();
view = body();
assert.ok(checkboxes(byClass(view, "pa-classification-options")).every(input => !input.props.checked));
assert.equal(nodes(view, child => child.type === "article").length, 0, "Clear removes every entry, including ungraded papers");
assert.equal(checkboxes(byClass(body({ compact: true }), "pa-classification-options")).length, 6);
console.log("PASS: aligned controls, exactly six choices, Select all/Clear actions, and bibliographic cards without allegations or grades.");

const selectControl = (view, label) => nodes(view, child => child.type === "select" && child.props["aria-label"] === label)[0];
const searchControl = view => nodes(view, child => child.type === "input" && child.props["aria-label"] === "Search papers, authors and claims")[0];
const urlParams = () => new URLSearchParams(location.search);
navigate("/?q=multiple&tag=neurips-2026&field=Optimization&severity=major&sort=title&page=3");
view = body();
assert.equal(searchControl(view).props.value, "multiple");
assert.equal(selectControl(view, "Paper collection").props.value, "neurips-2026");
assert.equal(selectControl(view, "Research field").props.value, "Optimization");
assert.equal(selectControl(view, "Sort entries").props.value, "title");
assert.deepEqual(checkboxes(byClass(view, "pa-classification-options")).map(input => input.props.checked), [false, false, false, false, true, false]);
const mainCard = nodes(view, child => child.type === "article")[0];
const mainHtml = renderToString(mainCard);
assert.match(mainHtml, /<h2><a href="[^"]*q=multiple[^"]*severity=major[^"]*page=3"[^>]*>Multiple findings<\/a><\/h2>/);
assert.match(mainHtml, /Original paper ↗/);
assert.match(mainHtml, /target="_blank" rel="noopener noreferrer"/);
assert.match(mainHtml, /pa-paper-summary/);
assert.match(mainHtml, /pa-field/);
selectControl(view, "Paper collection").props.onChange({ target: { value: "others" } });
assert.equal(urlParams().get("q"), "multiple");
assert.equal(urlParams().get("severity"), "major");
assert.equal(urlParams().get("sort"), "title");
assert.equal(urlParams().get("field"), "Optimization");
assert.equal(urlParams().has("page"), false, "Changing a filter resets pagination only");
assert.equal(selectControl(body(), "Paper collection").props.value, "others");
history.back();
assert.equal(selectControl(body(), "Paper collection").props.value, "neurips-2026", "Back restores filters from the URL");
history.forward();
assert.equal(selectControl(body(), "Paper collection").props.value, "others", "Forward restores filters from the URL");
const search = searchControl(body());
search.props.onChange({ target: { value: "f" } });
search.props.onChange({ target: { value: "fast typing" } });
assert.equal(searchControl(body()).props.value, "fast typing", "Rapid input uses the current URL and final input value");
assert.equal(urlParams().get("severity"), "major");
assert.equal(urlParams().get("tag"), "others");
view = body({ findings: papers });
action(view, "Clear filters").props.onClick();
assert.equal(location.search, "");
assert.equal(searchControl(body()).props.value, "");
assert.equal(selectControl(body(), "Sort entries").props.value, "newest");
assert.equal(checkboxes(byClass(body(), "pa-classification-options"))[0].props.checked, false);
view = body({ findings: papers });
action(view, "Next →").props.onClick();
assert.equal(urlParams().get("page"), "2");
assert.equal(nodes(body({ findings: papers }), child => child.type === "article").length, 10);
assert.match(renderToString(body({ findings: papers })), /Page <!-- -->2<!-- --> of <!-- -->3/);
assert.equal((render(location.search).match(/<article /g) || []).length, 10, "Reload renders the persisted page");
navigate("/review?paper=test-paper&q=foo&severity=none&sort=oldest&page=4");
view = body();
action(view, "Clear filters").props.onClick();
assert.equal(location.pathname, "/review");
assert.equal(location.search, "?paper=test-paper", "Clearing filters preserves the current report identity");
navigate("/");
console.log("PASS: URL search/collection/field/severity/sort/page persistence, fast input, Back/Forward, complete Clear filters reset, report context, paper-title heading and original source link.");

severityOpen = false;
let closedView = body();
assert.equal(checkboxes(closedView).length, 0, "Closed severity options are absent from the accessibility tree");
assert.equal(byClass(closedView, "pa-severity-trigger").props["aria-expanded"], false);
byClass(closedView, "pa-severity-trigger").props.onClick();
assert.equal(severityOpen, true);
assert.equal(byClass(body(), "pa-severity-trigger").props["aria-controls"], byClass(body(), "pa-classification-options").props.id);
const dismissView = body();
const severityDetails = byClass(dismissView, "pa-classifications");
const insideControl = {};
let restoredFocus = 0, preventedEscape = false;
const menu = { contains: target => target === insideControl };
byClass(dismissView, "pa-severity-trigger").props.ref.current = { focus: () => { restoredFocus++; } };
severityDetails.props.ref.current = menu;
const removeDismissListeners = effects[0]();
documentListeners.get("pointerdown")({ target: insideControl });
assert(severityOpen, "Selecting inside the multiselect keeps it open");
documentListeners.get("pointerdown")({ target: {} });
assert(!severityOpen, "An outside click dismisses the severity menu");
severityOpen = true;
documentListeners.get("keydown")({ key: "Enter" });
assert(severityOpen);
documentListeners.get("keydown")({ key: "Escape", preventDefault: () => { preventedEscape = true; } });
assert(!severityOpen && preventedEscape && restoredFocus === 1, "Escape dismisses and restores focus to the toggle");
severityOpen = true;
severityDetails.props.onBlurCapture({ currentTarget: menu, relatedTarget: insideControl });
assert(severityOpen);
severityDetails.props.onBlurCapture({ currentTarget: menu, relatedTarget: null });
assert(!severityOpen, "Moving keyboard focus outside dismisses the menu");
removeDismissListeners();
assert.equal(documentListeners.size, 0, "Dismissal listeners are removed on unmount");
const severityCss = readFileSync(new URL("../src/app/proof-atlas.css", import.meta.url), "utf8");
const palette = [...severityCss.matchAll(/--pa-severity-(?:no-issues|minor|repairable|major|critical|fixed): (#[a-f0-9]{6})/g)].map(match => match[1]);
assert.equal(palette.length, 12, "Six explicit severity accents per theme");
const luminance = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
for (const [theme, colors, backgrounds] of [["light", palette.slice(0, 6), ["#ffffff", "#faf9f6"]], ["dark", palette.slice(6), ["#212320", "#191a19"]]]) {
  assert.equal(new Set(colors).size, 6, `${theme}: distinct severity accents`);
  for (const color of colors) for (const background of backgrounds) {
    const levels = [luminance(color), luminance(background)].sort((a, b) => a - b);
    assert.ok((levels[1] + .05) / (levels[0] + .05) >= 4.5, `${theme}: ${color} text contrast`);
  }
}


const checkFixture = { id: "CHECK-1", location: "Theorem 1", claim: "CLAIM_TEXT", verdict: "confirmed", verificationStatus: "confirmed", explanation: "EXPLANATION_TEXT", impactSeverity: "major", title: "Published title", scope: "Requires independent coordinates.", verificationNote: "INTERNAL_NOTE", repair: "REPAIR_TEXT", contextBefore: "SOURCE_BEFORE", claimFormula: "x=1", contextAfter: "SOURCE_AFTER" };
const reviewFixture = { slug: "test-paper", title: "Paper title", year: 2026, category: "Theory", status: "finding", classifications: ["statement_false"], primaryUrl: "https://example.org/paper", reviewStage: "WORKFLOW_STAGE", severity: "major", summary: "SUMMARY_TEXT", checks: [checkFixture], sources: [] };
let currentReview = reviewFixture;
const reader = { exports: {} };
const readerDependencies = {
  ...dependencies,
  react: { ...React, useState: () => [{ slug: "test-paper", review: currentReview }, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) },
  "next/navigation": { useSearchParams: () => new URLSearchParams("paper=test-paper") },
  "@/lib/public-path": { publicPath: path => path },
  "./ClaimIllustration": { ClaimIllustration: () => null },
  "./ReviewIllustration": { ReviewIllustration: () => null },
  "./RichText": { InlineText: ({ text }) => text, RichText: ({ text }) => React.createElement("div", { className: "pa-rich-text" }, text) },
};
readerDependencies["@/lib/catalogue-navigation"] = navigation.exports;
readerDependencies["./ReadingLayout"] = { ReadingLayout: ({ children }) => children };
for (const name of ["CatalogueLink", "PaperHeader", "ReportOutline", "SeverityScale"]) {
  const componentModule = { exports: {} };
  const source = readFileSync(new URL(`../src/components/proof-atlas/${name}.tsx`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  runInNewContext(code, { module: componentModule, exports: componentModule.exports, require: name => readerDependencies[name] ?? require(name), URLSearchParams });
  readerDependencies[`./${name}`] = componentModule.exports;
}
const readerSource = readFileSync(new URL("../src/components/proof-atlas/ReviewedPaper.tsx", import.meta.url), "utf8");
const readerCode = ts.transpileModule(readerSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
runInNewContext(`${readerCode}\nexports.isReview = isReview;`, { module: reader, exports: reader.exports, require: name => readerDependencies[name] ?? require(name) });
function renderReview(overrides = {}) {
  currentReview = { ...reviewFixture, ...overrides };
  return renderToString(React.createElement(reader.exports.ReviewedPaper));
}
assert.equal(reader.exports.isReview(reviewFixture, "test-paper"), true);
assert.equal(reader.exports.isReview({ ...reviewFixture, checks: [{ ...checkFixture, contextBefore: 1 }] }, "test-paper"), false);
assert.equal(reader.exports.isReview({ ...reviewFixture, checks: [{ ...checkFixture, contextAfter: {} }] }, "test-paper"), false);
const sourceFixture = { url: "https://example.org/paper-v2.pdf", version: "v2", uploadedAt: "2026-10-24", sha256: "a".repeat(64) };
assert.equal(reader.exports.isReview({ ...reviewFixture, checks: [{ ...checkFixture, checkedSource: sourceFixture }] }, "test-paper"), true);
for (const checkedSource of [{ ...sourceFixture, url: "javascript:alert(1)" }, { ...sourceFixture, sha256: "bad" }, { ...sourceFixture, uploadedAt: 4 }]) {
  assert.equal(reader.exports.isReview({ ...reviewFixture, checks: [{ ...checkFixture, checkedSource }] }, "test-paper"), false);
}
const sourcedHtml = renderReview({ checks: [{ ...checkFixture, checkedSource: sourceFixture, checkedLocation: "Appendix G, Eq. 37" }] });
assert.match(sourcedHtml, /Appendix G, Eq. 37/);
assert.match(sourcedHtml, /https:\/\/example.org\/paper-v2.pdf/);
assert.match(sourcedHtml, /Uploaded <time dateTime="2026-10-24">2026-10-24<\/time>/);
const earlierReport = { label: "Earlier AI analysis", url: "https://example.org/analysis", summary: "SAME_ISSUE", publishedAt: "2026-10-05", relationship: "same_issue" };
assert.equal(reader.exports.isReview({ ...reviewFixture, checks: [{ ...checkFixture, relatedSources: [earlierReport] }] }, "test-paper"), true);
for (const report of [{ ...earlierReport, url: "javascript:alert(1)" }, { ...earlierReport, summary: 3 }]) {
  assert.equal(reader.exports.isReview({ ...reviewFixture, checks: [{ ...checkFixture, relatedSources: [report] }] }, "test-paper"), false);
}
const earlierHtml = renderReview({ checks: [{ ...checkFixture, relatedSources: [earlierReport] }] });
assert.match(earlierHtml, /<h3>Earlier analysis<\/h3>/);
assert.match(earlierHtml, /SAME_ISSUE/);
assert.match(earlierHtml, /2026-10-05/);
const coverageHtml = renderReview({ checks: [{ ...checkFixture, claimContext: "", claimFormula: "", checkedLocation: "" }] });
assert.doesNotMatch(coverageHtml, /<h3>Claim<\/h3>|<strong>Location<\/strong>|CLAIM_TEXT|Theorem 1/);
assert.match(coverageHtml, /EXPLANATION_TEXT/);
const publishedHtml = renderReview();
assert.match(publishedHtml, /<h3>What is wrong<\/h3>/);
assert.match(publishedHtml, /Requires independent coordinates/);
assert.doesNotMatch(publishedHtml, /Confirmed finding|Confirmed in narrower scope|INTERNAL_NOTE|WORKFLOW_STAGE|<h3>Verification/);
assert.equal((publishedHtml.match(/class="pa-claim-context"/g) || []).length, 1);
assert.match(publishedHtml, /<details class="pa-source-context"><summary>Paper context<\/summary>/);
assert.ok(publishedHtml.indexOf("CLAIM_TEXT") < publishedHtml.indexOf("x=1"));
assert.ok(publishedHtml.indexOf("x=1") < publishedHtml.indexOf("SOURCE_BEFORE"));
assert.ok(publishedHtml.indexOf("SOURCE_BEFORE") < publishedHtml.indexOf("SOURCE_AFTER"));
for (const verificationStatus of ["unclear", "unverified", "unresolved", "unknown", ""]) {
  const html = renderReview({ checks: [{ ...checkFixture, verificationStatus }] });
  assert.match(html, /No finding published for this paper\./);
  assert.doesNotMatch(html, /CLAIM_TEXT|EXPLANATION_TEXT|Published title|pa-review-grade|SUMMARY_TEXT/);
}
const bibliographicReview = renderReview({ severity: null });
assert.match(bibliographicReview, /No finding published for this paper\./);
assert.doesNotMatch(bibliographicReview, /CLAIM_TEXT|EXPLANATION_TEXT|Published title|pa-review-grade|SUMMARY_TEXT/);
assert.match(renderReview({ checks: [{ ...checkFixture, verificationStatus: undefined }] }), /EXPLANATION_TEXT/, "Known legacy verdicts remain readable");
assert.doesNotMatch(renderReview({ checks: [{ ...checkFixture, verificationStatus: undefined, verdict: "pending" }] }), /EXPLANATION_TEXT/, "Unknown legacy verdicts stay unpublished");
for (const verificationStatus of ["refuted", "no_error_found", "resolved_in_original"]) {
  const html = renderReview({ severity: "no_issues", checks: [{ ...checkFixture, verificationStatus, impactSeverity: "no_issues" }] });
  assert.match(html, /No issues found/);
  assert.match(html, /<h3>Assessment<\/h3>/);
  assert.doesNotMatch(html, /What is wrong|Possible repair|REPAIR_TEXT|Confirmed|No issue established/);
}
const followUpHtml = renderReview({ status: "addressed", checks: [{ ...checkFixture, verificationStatus: "addressed" }] });
const screeningHtml = renderReview({ severity: "no_issues", checks: [{ ...checkFixture, verificationStatus: "no_error_found", impactSeverity: "no_issues", claimContext: undefined, claimFormula: undefined, claim: "true" }] });
assert.doesNotMatch(screeningHtml, /<h3>Claim<\/h3>|>true</);
assert.match(renderReview({ checks: [{ ...checkFixture, originalIndex: 6 }] }), /id="check-7"/);
assert.match(followUpHtml, /Follow-up/);
assert.doesNotMatch(followUpHtml, />Addressed</);
const mixedHtml = renderReview({ checks: [{ ...checkFixture, verificationStatus: "unclear", title: "UNPUBLISHED_TITLE" }, checkFixture] });
assert.doesNotMatch(mixedHtml, /UNPUBLISHED_TITLE|SUMMARY_TEXT/);
const scopedHtml = renderReview({ severity: "repairable", checks: [
  { ...checkFixture, reviewScope: "outside_mathematics", title: "REPORTING_ONLY_TITLE" },
  { ...checkFixture, impactSeverity: "repairable" },
] });
assert.doesNotMatch(scopedHtml, /REPORTING_ONLY_TITLE|SUMMARY_TEXT/, "Reporting observations are outside the mathematical review");
assert.match(scopedHtml, /id="check-2" open=""/, "Retain the mathematical finding and its original anchor");
assert.match(mixedHtml, /id="check-2"/, "Existing check anchors survive filtering");
const leadingHtml = renderReview({ severity: "major", checks: [
  { ...checkFixture, id: "clear", verificationStatus: "refuted", impactSeverity: "no_issues" },
  { ...checkFixture, id: "major-first", impactSeverity: "major" },
  { ...checkFixture, id: "major-second", impactSeverity: "major" },
] });
assert.match(leadingHtml, /id="check-2" open=""/, "Open the first finding at the paper's highest severity");
assert.doesNotMatch(leadingHtml, /id="check-(1|3)" open=/, "Keep other findings collapsed and preserve anchors");
console.log("PASS: reader publication gating, safe legacy fallback, neutral bibliographic view, assessment headings, scientific scope and source-context order.");

// Review illustrations: each one renders an accessible figure and belongs to a published critical or major finding.
const illustrationModule = { exports: {} };
const illustrationCode = ts.transpileModule(readFileSync(new URL("../src/components/proof-atlas/ReviewIllustration.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
runInNewContext(illustrationCode, { module: illustrationModule, exports: illustrationModule.exports, require });
const { ReviewIllustration, reviewIllustrations } = illustrationModule.exports;
const publishedChecks = new Map();
for (let shard = 0; shard < 64; shard++) {
  for (const review of Object.values(JSON.parse(readFileSync(new URL(`../data/reviews/${shard}.json`, import.meta.url), "utf8")))) {
    for (const check of review.checks) publishedChecks.set(check.id, check);
  }
}
for (const [checkId, kind] of Object.entries(reviewIllustrations)) {
  const check = publishedChecks.get(checkId);
  assert.ok(check, `Illustration attached to a missing check: ${checkId}`);
  assert.ok(["critical", "major"].includes(check.impactSeverity), `Illustration on a ${check.impactSeverity} check: ${checkId}`);
  assert.ok(["confirmed", "confirmed_but_rescoped"].includes(check.verificationStatus ?? check.verdict) && check.duplicateOf === undefined, `Illustration on an unpublished check: ${checkId}`);
  const html = renderToString(React.createElement(ReviewIllustration, { checkId }));
  assert.match(html, new RegExp(`data-illustration="${kind}"`));
  assert.match(html, /role="img"/);
  assert.doesNotMatch(html, /NaN|Infinity/, `Non-finite geometry in ${kind}`);
}
assert.equal(renderToString(React.createElement(ReviewIllustration, { checkId: "UNKNOWN" })), "");
console.log(`PASS: ${Object.keys(reviewIllustrations).length} review illustrations render accessible figures on published critical or major findings.`);
