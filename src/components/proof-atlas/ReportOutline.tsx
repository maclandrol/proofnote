"use client";
import { useEffect, useState } from "react";
import { InlineText } from "./RichText";

type Section = { id: string; title: string };
type Finding = Section & { sections?: Section[]; severity?: string | null };
type Props = { findings: Finding[]; context?: boolean; sources?: boolean };

/** Report navigation: one row per finding, with the reader's current position highlighted and its sections expanded. */
export function ReportOutline({ findings, context = false, sources = true }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const ids = [...(context ? ["context"] : []), ...findings.flatMap(f => [f.id, ...(f.sections ?? []).map(s => s.id)]), ...(sources ? ["sources"] : [])];
  const key = ids.join("|");
  useEffect(() => {
    const targets = key.split("|").map(id => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.target); else visible.delete(entry.target.id);
      }
      // A finding contains its sections, so the latest-starting visible target is the most specific one.
      const [deepest] = [...visible.values()].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
      if (deepest) setActive(deepest.id);
    }, { rootMargin: "-12% 0px -70% 0px" });
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [key]);
  const current = findings.find(f => f.id === active || f.sections?.some(s => s.id === active))?.id;
  const item = (id: string, label: string) => <li className={active === id ? "pa-outline-active" : undefined}><a href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a></li>;
  return <><p className="pa-eyebrow">In this paper</p><nav className="pa-report-outline" aria-label="In this paper"><ol>
    {context && item("context", "Paper context")}
    {findings.map((finding, index) => {
      const open = findings.length === 1 || finding.id === current;
      return <li key={finding.id} className={`pa-outline-finding${finding.id === current ? " pa-outline-current" : ""}`}>
        <a href={`#${finding.id}`} aria-current={active === finding.id ? "location" : undefined}>
          <span className="pa-outline-number">{String(index + 1).padStart(2, "0")}</span>
          {finding.severity && <span className={`pa-outline-dot pa-severity-${finding.severity}`} aria-hidden="true" />}
          <span className="pa-outline-title"><InlineText text={finding.title} /></span>
        </a>
        {open && Boolean(finding.sections?.length) && <ol>{finding.sections?.map(section => <li key={section.id} className={active === section.id ? "pa-outline-active" : undefined}><a href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}>{section.title}</a></li>)}</ol>}
      </li>;
    })}
    {sources && item("sources", "Sources")}
  </ol></nav></>;
}
