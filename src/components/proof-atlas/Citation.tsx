import type { FindingSummary } from "./types";

export function Citation({ finding: f }: { finding: FindingSummary; compact?: boolean }) {
  if (f.citationCount == null) return null;
  const count = `${f.citationCount.toLocaleString("en-US")} citations`;
  return <div className="pa-citation">{f.citationUrl ? <a href={f.citationUrl} target="_blank" rel="noopener noreferrer">{count} ↗</a> : <span>{count}</span>}</div>;
}
