import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as types from "../src/components/proof-atlas/types.ts";

const jsx = (type, props) => typeof type === "function" ? type(props) : { type, props };
const runtime = { jsx, jsxs: jsx };
function load(path, dependencies, globals = {}) {
  const output = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    module: output, exports: output.exports, URL, URLSearchParams, ...globals,
    require: name => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return output.exports;
}

let effect;
let dependencies;
let scrolls = 0;
const listeners = new Set();
class Details {
  constructor(parentElement = null) { this.parentElement = parentElement; this.open = false; }
}
const context = new Details();
const check = new Details(context);
const target = { parentElement: check, closest: () => true, scrollIntoView: () => scrolls++ };
const outside = { closest: () => null, scrollIntoView: () => assert.fail("Outside article must not scroll") };
const window = {
  location: { hash: "#claim" },
  addEventListener: (event, callback) => { assert.equal(event, "hashchange"); listeners.add(callback); },
  removeEventListener: (event, callback) => { assert.equal(event, "hashchange"); assert.ok(listeners.delete(callback)); },
};
const { ReadingLayout } = load("src/components/proof-atlas/ReadingLayout.tsx", {
  react: { useState: () => [true, () => {}], useEffect: (callback, deps) => { effect = callback; dependencies = deps; } },
  "react/jsx-runtime": runtime,
  "./ShareButton": { ShareButton: () => null },
}, {
  window,
  document: { getElementById: id => id === "claim" ? target : id === "outside" ? outside : null },
  HTMLDetailsElement: Details,
});
const firstArticle = {};
ReadingLayout({ sidebar: null, children: firstArticle });
assert.equal(dependencies[0], firstArticle);
let cleanup = effect();
assert.ok(check.open && context.open, "Initial hash opens every enclosing details");
assert.equal(scrolls, 1);
assert.equal(listeners.size, 1);
const dispatchHash = hash => { window.location.hash = hash; for (const listener of listeners) listener(); };
check.open = context.open = false;
dispatchHash("#claim");
assert.ok(check.open && context.open, "Changed hash reopens collapsed ancestors");
assert.equal(scrolls, 2);
check.open = context.open = false;
for (const hash of ["#%", "#outside", "#missing", ""]) assert.doesNotThrow(() => dispatchHash(hash));
assert.equal(scrolls, 2);
assert.ok(!check.open && !context.open);
cleanup();
assert.equal(listeners.size, 0);
const nextArticle = {};
window.location.hash = "#claim";
ReadingLayout({ sidebar: null, children: nextArticle });
assert.equal(dependencies[0], nextArticle, "Replacing loaded article reruns fragment opening");
cleanup = effect();
assert.ok(check.open && context.open);
assert.equal(scrolls, 3);
cleanup();
assert.equal(listeners.size, 0);

const navigation = load("src/lib/catalogue-navigation.ts", { "../components/proof-atlas/types": types });
const query = "q=diffusion&severity=major&field=Optimization&tag=neurips-2026&sort=title&page=3";
const pushed = [];
const { PaperPicker } = load("src/components/proof-atlas/PaperPicker.tsx", {
  react: { Suspense: "suspense" },
  "react/jsx-runtime": runtime,
  "next/navigation": { useRouter: () => ({ push: href => pushed.push(href) }), useSearchParams: () => new URLSearchParams(query) },
  "@/lib/catalogue-navigation": navigation,
});
const picker = PaperPicker({ active: "original", papers: [
  { slug: "original", title: "Actual paper title", issueTitle: "Finding headline" },
  { slug: "native", issueTitle: "Legacy fallback", noteUrl: "/review?paper=native#check-7" },
  { slug: "unsafe", issueTitle: "Unsafe", noteUrl: "//outside.example" },
] });
const select = picker.props.children.props.children[1];
assert.equal(select.props.children[0].props.children, "Actual paper title");
assert.equal(select.props.children[1].props.children, "Legacy fallback");
for (const slug of ["original", "native", "unsafe"]) select.props.onChange({ target: { value: slug } });
for (const [index, pathname] of ["/original", "/review", "/unsafe"].entries()) {
  const href = new URL(pushed[index], "https://catalogue.test");
  assert.equal(href.pathname, pathname);
  for (const [key, value] of new URLSearchParams(query)) assert.equal(href.searchParams.get(key), value);
}
assert.equal(new URL(pushed[1], "https://catalogue.test").searchParams.get("paper"), "native");
assert.equal(new URL(pushed[1], "https://catalogue.test").hash, "#check-7");
select.props.onChange({ target: { value: "missing" } });
assert.equal(pushed.length, 3);
console.log("PASS: nested reading fragments, ignored invalid/outside targets, effect cleanup/article changes, and paper-title picker with preserved catalogue filters/native anchors.");
