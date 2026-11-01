"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ShareButton } from "./ShareButton";

export function ReadingLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    const openTarget = () => {
      let id;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = id ? document.getElementById(id) : null;
      if (!target?.closest(".pa-article")) return;
      for (let parent: HTMLElement | null = target; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
      target.scrollIntoView({ block: "start" });
    };
    openTarget();
    window.addEventListener("hashchange", openTarget);
    return () => window.removeEventListener("hashchange", openTarget);
  }, [children]);
  return <>
    <div className="pa-reading-actions"><button className="pa-sidebar-toggle" aria-expanded={expanded} aria-controls="paper-index"
      onClick={() => setExpanded(value => !value)}>
      <span aria-hidden="true">{expanded ? "←" : "→"}</span> {expanded ? "Hide outline" : "Show outline"}
    </button><ShareButton /></div>
    <div className={`pa-reading-layout${expanded ? "" : " pa-reading-expanded"}`}>
      <aside id="paper-index" className="pa-sidebar" hidden={!expanded}>{sidebar}</aside>
      {sidebar && <details className="pa-mobile-outline"><summary>In this paper</summary>{sidebar}</details>}
      {children}
    </div>
  </>;
}
