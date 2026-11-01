import { Fragment, type ReactNode } from "react";
import katex from "katex";

type MathPart = { source: string; formula: string; end: number; display: boolean };
const environments = /^(?:[pbBvV]?matrix|smallmatrix|cases|array|aligned|alignedat|gathered|align\*?|gather\*?|equation\*?)$/;

function escaped(text: string, at: number) {
  let slashes = 0;
  while (at > 0 && text[--at] === "\\") slashes++;
  return slashes % 2 === 1;
}

function mathAt(text: string, at: number): MathPart | null {
  if (text[at] !== "$" && text[at] !== "\\") return null;
  if (escaped(text, at)) return null;
  const rest = text.slice(at);
  const delimiter = rest.startsWith("$$") ? ["$$", "$$"]
    : rest.startsWith("\\[") ? ["\\[", "\\]"]
      : rest.startsWith("\\(") ? ["\\(", "\\)"]
        : rest.startsWith("$") && !/\s/.test(rest[1] ?? " ") ? ["$", "$"] : null;
  if (delimiter) {
    const [open, close] = delimiter;
    let braces = 0, firstClose = -1;
    const part = (end: number): MathPart | null => {
      const formula = text.slice(at + open.length, end);
      return formula.trim() ? { source: text.slice(at, end + close.length), formula, end: end + close.length, display: open === "$$" || open === "\\[" } : null;
    };
    for (let end = at + open.length; end < text.length; end++) {
      if (escaped(text, end)) continue;
      if (text[end] === "{") braces++;
      else if (text[end] === "}") braces = Math.max(0, braces - 1);
      if (text.startsWith(close, end) && (open !== "$" || (text[end + 1] !== "$" && !/\s/.test(text[end - 1])))) {
        if (!braces) return part(end);
        if (firstClose < 0) firstClose = end;
      }
    }
    return firstClose < 0 ? null : part(firstClose);
  }
  const environment = /^\\begin\{([^}]+)\}/.exec(rest);
  if (!environment || !environments.test(environment[1])) return null;
  const open = environment[0], close = `\\end{${environment[1]}}`;
  let depth = 1, cursor = at + open.length;
  while (depth) {
    const nextOpen = text.indexOf(open, cursor), nextClose = text.indexOf(close, cursor);
    if (nextClose < 0) return null;
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; cursor = nextOpen + open.length; }
    else { depth--; cursor = nextClose + close.length; }
  }
  const source = text.slice(at, cursor);
  return { source, formula: source, end: cursor, display: true };
}

function MathText({ part, inline = false }: { part: MathPart; inline?: boolean }) {
  let html: string | null = null;
  try {
    // These adaptations affect package typography and page layout, not the formula.
    const formula = part.formula
      .replace(/\\color\[rgb\]\{(0(?:\.\d+)?|1(?:\.0+)?),(0(?:\.\d+)?|1(?:\.0+)?),(0(?:\.\d+)?|1(?:\.0+)?)\}/g, (_, r, g, b) => `\\color{#${[r, g, b].map(channel => Math.round(Number(channel) * 255).toString(16).padStart(2, "0")).join("")}}`)
      .replace(/\\vskip\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:pt|em|ex|mm|cm|in)\b/g, "")
      .replace(/\\penalty\b(?:\s*[+-]?\d+)?/g, "");
    html = katex.renderToString(formula, {
      displayMode: part.display && !inline,
      output: "htmlAndMathml",
      throwOnError: true,
      trust: false,
      strict: "ignore",
      maxExpand: 1000,
      maxSize: 20,
      macros: {
        "\\nicefrac": "\\frac{#1}{#2}", "\\mathbbm": "\\mathbb{#1}",
        "\\textsc": "\\text{#1}", "\\mbox": "\\text{#1}", "\\scalebox": "\\@secondoftwo{#1}{\\text{#2}}", "\\footnotesize": "\\relax",
        "\\train": "\\mathrm{train}", "\\Var": "\\operatorname{Var}",
        "\\tr": "\\operatorname{tr}", "\\expectation": "\\mathbb{E}",
      },
    });
  } catch {
    html = null;
  }
  // Only KaTeX's untrusted-mode output enters HTML; source prose is React text.
  return html === null ? <span className="pa-math-fallback">{part.source}</span>
    : <span className={part.display && !inline ? "pa-math-display" : "pa-inline-math"} dangerouslySetInnerHTML={{ __html: html }} />;
}

function standaloneFormula(text: string): MathPart | null {
  const source = text.trim();
  if (!/^\\[A-Za-z]+/.test(source) || /\n\s*\n/.test(source)) return null;
  const symbols = source.replace(/\\(?:text|operatorname|mathrm|mathsf)\{[^{}]*\}/g, "").replace(/\\[A-Za-z]+/g, "");
  if (/[A-Za-z]{3,}/.test(symbols)) return null;
  const formula = /(^|[^\\])&/.test(source) && !source.includes("\\begin{") ? `\\begin{aligned}${source}\\end{aligned}` : source;
  return { source, formula, end: text.length, display: true };
}

function safeHref(url: string) {
  return !/[\\\u0000-\u0020]/.test(url) && /^(?:https?:\/\/|\/(?!\/)|#)/i.test(url) ? url : undefined;
}

function inlineNodes(text: string, inline = false, depth = 0): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0, plain = "";
  const push = (node: ReactNode) => {
    if (plain) { nodes.push(plain); plain = ""; }
    nodes.push(<Fragment key={nodes.length}>{node}</Fragment>);
  };
  while (cursor < text.length) {
    if (text[cursor] === "`") {
      const marker = /^`+/.exec(text.slice(cursor))![0];
      const end = text.indexOf(marker, cursor + marker.length);
      if (end >= 0) {
        push(<code>{text.slice(cursor + marker.length, end)}</code>);
        cursor = end + marker.length;
        continue;
      }
    }
    const math = mathAt(text, cursor);
    if (math) { push(<MathText part={math} inline={inline} />); cursor = math.end; continue; }
    if (text[cursor] === "\\" && /[$`*_#]/.test(text[cursor + 1] ?? "")) {
      plain += text[cursor + 1]; cursor += 2; continue;
    }
    if (depth < 3) {
      const link = text[cursor] === "[" ? /^\[([^\]\n]+)\]\(([^\s)]+)\)/.exec(text.slice(cursor)) : null;
      if (link && safeHref(link[2])) {
        push(<a href={link[2]} {...(/^https?:/i.test(link[2]) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inlineNodes(link[1], true, depth + 1)}</a>);
        cursor += link[0].length;
        continue;
      }
      const marker = text.startsWith("**", cursor) ? "**" : text[cursor] === "*" && !/\s/.test(text[cursor + 1] ?? " ") ? "*" : null;
      if (marker) {
        const end = text.indexOf(marker, cursor + marker.length);
        if (end > cursor + marker.length) {
          const content = inlineNodes(text.slice(cursor + marker.length, end), inline, depth + 1);
          push(marker === "**" ? <strong>{content}</strong> : <em>{content}</em>);
          cursor = end + marker.length;
          continue;
        }
      }
    }
    plain += text[cursor++];
  }
  if (plain) nodes.push(plain);
  return nodes;
}

export function InlineText({ text }: { text: string }) {
  const bare = standaloneFormula(text);
  return <span className="pa-inline-text">{bare ? <MathText part={bare} inline /> : inlineNodes(text, true)}</span>;
}

const fencePattern = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const headingPattern = /^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?$/;
const listPattern = /^ {0,3}([-+*]|\d+[.)])\s+(.*)$/;

export function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let line = 0;
  while (line < lines.length) {
    if (!lines[line].trim()) { line++; continue; }
    const fence = fencePattern.exec(lines[line]);
    if (fence) {
      const code: string[] = [];
      line++;
      while (line < lines.length && !new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[line])) code.push(lines[line++]);
      if (line < lines.length) line++;
      blocks.push(<pre key={blocks.length}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const rest = lines.slice(line).join("\n").trimStart();
    const math = mathAt(rest, 0);
    if (math?.display && !rest.slice(math.end).split("\n", 1)[0].trim()) {
      blocks.push(<div className="pa-rich-display" key={blocks.length}><MathText part={math} /></div>);
      line += rest.slice(0, math.end).split("\n").length;
      continue;
    }
    const heading = headingPattern.exec(lines[line]);
    if (heading) {
      const Heading = `h${Math.min(6, heading[1].length + 2)}` as "h3" | "h4" | "h5" | "h6";
      blocks.push(<Heading key={blocks.length}>{inlineNodes(heading[2])}</Heading>);
      line++;
      continue;
    }
    const list = listPattern.exec(lines[line]);
    if (list) {
      const ordered = /^\d/.test(list[1]), items: ReactNode[] = [];
      let item;
      while (line < lines.length && (item = listPattern.exec(lines[line])) && /^\d/.test(item[1]) === ordered) {
        let content = item[2];
        line++;
        while (line < lines.length && /^ {2,}\S/.test(lines[line]) && !listPattern.test(lines[line])) content += `\n${lines[line++].trimStart()}`;
        items.push(<li key={items.length}>{inlineNodes(content)}</li>);
      }
      blocks.push(ordered ? <ol key={blocks.length} start={parseInt(list[1], 10)}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
      continue;
    }
    const paragraph = [lines[line++]];
    while (line < lines.length && lines[line].trim() && !fencePattern.test(lines[line]) && !headingPattern.test(lines[line]) && !listPattern.test(lines[line])) paragraph.push(lines[line++]);
    const content = paragraph.join("\n");
    const bare = standaloneFormula(content);
    blocks.push(bare ? <div className="pa-rich-display" key={blocks.length}><MathText part={bare} /></div> : <p key={blocks.length}>{inlineNodes(content)}</p>);
  }
  return <div className="pa-rich-text">{blocks}</div>;
}
