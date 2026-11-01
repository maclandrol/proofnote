import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const filename = new URL("../src/components/proof-atlas/RichText.tsx", import.meta.url);
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const compiledModule = { exports: {} };
runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: createRequire(import.meta.url) }, { filename: filename.pathname });
const { RichText, InlineText } = compiledModule.exports;
const render = (text, inline = false) => renderToStaticMarkup(React.createElement(inline ? InlineText : RichText, { text }));
const mathCount = html => (html.match(/class="katex"/g) ?? []).length;

const escaped = render('<script>alert("x")</script> <img src=x onerror=alert(1)> & text');
assert.ok(!escaped.includes("<script") && !escaped.includes("<img"));
assert.match(escaped, /&lt;script&gt;/);
assert.match(escaped, /&amp; text/);
const links = render("[Source](https://example.org/paper) [unsafe](javascript:alert) [also unsafe](/\\evil.org)");
assert.equal((links.match(/<a /g) ?? []).length, 1);
assert.match(links, /rel="noopener noreferrer"/);
assert.ok(!render(String.raw`$\href{javascript:alert(1)}{x}$`).includes("href="));

const inline = render(String.raw`With $x^2+\alpha$, \(a+b\), and \$5.`, true);
assert.equal(mathCount(inline), 2);
assert.ok(!inline.includes("<p>") && !inline.includes("katex-display"));
assert.match(inline, /\$5\./);
assert.equal(mathCount(render("Costs $5 and $10.")), 0);
const display = render(String.raw`$$\frac{1}{2}$$

\[\sum_{i=1}^n i\]`);
assert.equal(mathCount(display), 2);
assert.equal((display.match(/class="katex-display"/g) ?? []).length, 2);
assert.match(display, /<math .*display="block"/);
assert.equal(mathCount(render(String.raw`\leq\frac{9\epsilon}{16}+5R^2\delta\leq\epsilon`)), 1);

const matrix = render(String.raw`\begin{pmatrix}
1 & 2 \\
3 & 4
\end{pmatrix}`);
assert.equal(mathCount(matrix), 1);
assert.match(matrix, /<mtable/);
const cases = render(String.raw`$c=\begin{cases}0&x<0\\1&x\geq0\end{cases}$`);
assert.equal(mathCount(cases), 1);
assert.equal(mathCount(render(String.raw`$p\geq7/8\quad\text{for all $z\in\{-1,+1\}^{h}$}.$`)), 1);
assert.equal(mathCount(render(String.raw`$\nicefrac{1}{2}+\mathbbm{1}+\textsc{Cost}(x)+\scalebox{0.5}{$\mathrm{min}$}$`)), 1);
assert.equal(mathCount(render(String.raw`\log g_j(x)\quad&\text{if }j\in[M]`)), 1);
assert.equal(mathCount(render(String.raw`$\hat m_{{\rm BP}_{\mbox{\rm\footnotesize c}}(r)};\penalty\ \penalty\ x=1$`)), 1);

const markdown = render("# Reconstruction\n\nA **strict** bound.\n\n- First $x$\n- Second\n\n3. Third\n4. Fourth");
assert.match(markdown, /<h3>Reconstruction<\/h3>/);
assert.match(markdown, /<strong>strict<\/strong>/);
assert.match(markdown, /<ul><li>/);
assert.match(markdown, /<ol start="3"><li>/);
assert.equal(mathCount(markdown), 1);
const code = render('`$x$ <b>`\n\n```tex\n$y$ <script>\n```\n\nAfter $z$.');
assert.match(code, /<code>\$x\$ &lt;b&gt;<\/code>/);
assert.match(code, /<pre><code>\$y\$ &lt;script&gt;<\/code><\/pre>/);
assert.equal(mathCount(code), 1);
assert.equal(mathCount(render("```tex\n$x$\n")), 0);
const invalid = render(String.raw`Bad $\frac{1}{$ and unclosed \[a+b.`);
assert.match(invalid, /pa-math-fallback/);
assert.ok(invalid.includes(String.raw`$\frac{1}{$`) && invalid.includes(String.raw`\[a+b.`));
assert.equal(mathCount(invalid), 0);
console.log("PASS: escaped HTML and unsafe links, inline/display/bare TeX, matrices, Markdown, literal code, malformed-math fallback.");

const auditIndex = process.argv.indexOf("--audit");
if (auditIndex >= 0) {
  const destination = process.argv[auditIndex + 1];
  assert.ok(destination, "Supply a JSON receipt path after --audit.");
  const data = new URL("../data/", import.meta.url);
  const files = readdirSync(new URL("reviews/", data)).filter(name => name.endsWith(".json")).map(name => `reviews/${name}`);
  files.push(...["findings.json", "addressed.json", "neurips-2026.json", "neurips-2026-addressed.json", "withdrawn.json"].filter(name => existsSync(new URL(name, data))));
  const receipt = {
    auditedAt: new Date().toISOString(), records: 0, fields: 0, renderedMath: 0, fallbackCount: 0, fallbacks: [], sources: [],
    renderAdaptations: [
      "Balanced braces preserve inner dollar math within text groups.",
      "Bare alignment rows use the aligned environment; mathematical source is unchanged.",
      "Package typography: nicefrac uses frac; mathbbm uses mathbb; textsc/mbox use text; scalebox retains its text content; footnotesize retains the surrounding math size.",
      "RGB color becomes an equivalent CSS color; vertical page-spacing vskip and line-breaking penalty commands are omitted.",
      "Paper macro aliases: train is an upright label; Var/tr are named operators; expectation is blackboard E.",
    ],
    macroEvidence: [
      { paperId: "152898", cachedTextLines: "54-56", meaning: "train labels training compute" },
      { paperId: "153293", cachedTextLines: "234-237", meaning: "Var has the variance identity Var(a+bX)=b^2 Var(X)" },
      { paperId: "150004", cachedTextLines: "1752,2162", meaning: "tr denotes matrix trace in quadratic expectations" },
      { paperId: "148397", cachedTextLines: "381-396", meaning: "expectation is the expectation operator over random f" },
    ],
  };
  const decode = value => value.replace(/&#(?:x([\da-f]+)|(\d+));|&(amp|lt|gt|quot|apos);/gi, (_, hex, decimal, name) => hex || decimal ? String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10)) : ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[name]);
  const proseFields = new Set(["title", "issueTitle", "paperSummary", "theoryRole", "originalClaim", "assumptions", "plainExplanation", "counterexample", "impact", "practical", "repair", "implementation", "caveats", "correctionSearch", "summary", "claim", "claimContext", "claimFormula", "contextBefore", "contextAfter", "explanation", "demonstration", "scope", "whyItMatters", "verificationNote", "statusExplanation", "text", "resolution", "addressingRelationship", "location", "label", "version"]);
  for (const file of files) {
    const bytes = readFileSync(new URL(file, data));
    receipt.sources.push({ file: `data/${file}`, sha256: createHash("sha256").update(bytes).digest("hex") });
    const parsed = JSON.parse(bytes.toString());
    const records = Array.isArray(parsed) ? parsed : Object.values(parsed);
    for (const record of records) {
      receipt.records++;
      const visit = (value, path = "", inherited = false, checkId) => {
        if (typeof value === "string" && inherited && value.trim()) {
          const html = render(path.endsWith(".claimFormula") ? `$$${value}$$` : value, /(?:^|\.)(?:title|issueTitle|location|label|version)$/.test(path));
          receipt.fields++;
          receipt.renderedMath += mathCount(html);
          const fallbacks = [...html.matchAll(/<span class="pa-math-fallback">([\s\S]*?)<\/span>/g)].map(match => decode(match[1]));
          if (fallbacks.length) {
            receipt.fallbackCount += fallbacks.length;
            receipt.fallbacks.push({ file: `data/${file}`, slug: record.slug, checkId, field: path, source: value, fallbacks });
          }
        } else if (Array.isArray(value)) value.forEach((child, index) => visit(child, `${path}[${index}]`, inherited, checkId));
        else if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => visit(child, path ? `${path}.${key}` : key, proseFields.has(key), value.id ?? checkId));
      };
      visit(record);
    }
  }
  writeFileSync(destination, `${JSON.stringify(receipt, null, 2)}\n`);
  assert.ok(receipt.fallbacks.every(item => item.checkId === "SUS26-148762-02" && item.field === "checks[1].claim"), "Unexpected math rendering failure; see receipt.");
  console.log(JSON.stringify({ records: receipt.records, fields: receipt.fields, renderedMath: receipt.renderedMath, fallbackCount: receipt.fallbackCount, fallbackFields: receipt.fallbacks.length, receipt: destination }));
}
