import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { publicReview, publicIndex } from "./public-records.mjs";
import assert from "node:assert/strict";
const index = JSON.parse(readFileSync("data/scanned-papers.json", "utf8"));
const copyOverrides = JSON.parse(readFileSync("data/reader-copy.json", "utf8"));
const { totalScanned, collections } = index;
writeFileSync("src/data/proof-atlas-scan-counts.json", JSON.stringify({ totalScanned, collections }, null, 2) + "\n");
mkdirSync("public/data/proof-atlas/reviews", { recursive: true });
const publicReviews = {};
for (const file of readdirSync("data/reviews")) if (/^\d+\.json$/.test(file)) {
  const source = JSON.parse(readFileSync(`data/reviews/${file}`, "utf8"));
  const shard = Object.fromEntries(Object.entries(source).map(([slug, review]) => [slug, publicReview(review, copyOverrides)]));
  Object.assign(publicReviews, shard);
  writeFileSync(`public/data/proof-atlas/reviews/${file}`, JSON.stringify(shard) + "\n");
}
for (const override of copyOverrides) assert.ok(Object.values(publicReviews).some(review => review.checks.some(check => check.id === override.checkId && check[override.field] === override.after)), `Unused public copy repair: ${override.checkId}`);
writeFileSync("public/data/proof-atlas/scanned-papers.json", JSON.stringify(publicIndex(index, publicReviews)) + "\n");
// The index page fetches this slim copy: only the fields the list shows and searches, with short previews.
const preview = (text, limit = 300) => {
  if (text.length <= limit) return text;
  let cut = text.slice(0, limit).replace(/\s+\S*$/, "");
  if ((cut.match(/(?<!\\)\$/g) ?? []).length % 2) cut = cut.slice(0, cut.lastIndexOf("$"));
  if (cut.lastIndexOf("\\(") > cut.lastIndexOf("\\)")) cut = cut.slice(0, cut.lastIndexOf("\\("));
  return `${cut.trimEnd()}…`;
};
const listed = ["slug", "title", "authors", "issueTitle", "year", "category", "status", "plainExplanation", "primaryUrl", "citationCount", "citationUrl", "collection", "severity", "issueTypes", "noteUrl", "fixedAt"];
const catalogue = JSON.parse(readFileSync("public/data/proof-atlas/scanned-papers.json", "utf8")).papers.map(paper => {
  const entry = Object.fromEntries(listed.filter(key => key in paper).map(key => [key, paper[key]]));
  return { ...entry, issueTitle: paper.issueTitle === paper.title ? "" : paper.issueTitle, plainExplanation: preview(paper.plainExplanation) };
});
writeFileSync("public/data/proof-atlas/catalogue.json", JSON.stringify(catalogue) + "\n");
for (const [source, target] of [["findings.json","proof-atlas.json"],["addressed.json","proof-atlas-addressed.json"],["neurips-2026.json","proof-atlas-neurips-2026.json"],["neurips-2026-addressed.json","proof-atlas-neurips-2026-addressed.json"]]) { copyFileSync(`data/${source}`,`src/data/${target}`); copyFileSync(`data/${source}`,`public/data/proof-atlas/${source}`); }
copyFileSync("data/reproduce.py","public/data/proof-atlas/reproduce.py");
copyFileSync("data/reproduce-belief.py","public/data/proof-atlas/reproduce-belief.py");

copyFileSync("data/reproduce-neurips-2026.py", "public/data/proof-atlas/reproduce-neurips-2026.py");
