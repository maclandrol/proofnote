import Link from "next/link";
import { scaleSeverities, severityDescriptions, severityLabels, type Severity } from "./types";

/** Places a graded paper on the five-step scale and states what its grade means. */
export function SeverityScale({ value }: { value?: string | null }) {
  if (!value || value === "no_issues" || value === "fixed" || !Object.hasOwn(severityLabels, value)) return null;
  const grade = value as Severity;
  return <div className="pa-severity-scale">
    <ol aria-label="Severity scale, least to most severe">{scaleSeverities.map(level => <li key={level} className={`pa-severity-${level}`} aria-current={level === grade ? "true" : undefined}><span>{severityLabels[level]}</span></li>)}</ol>
    <p><strong>{severityLabels[grade]}.</strong> {severityDescriptions[grade]} A paper takes the highest severity among its findings. <Link href="/methodology#severity">How grades are assigned</Link></p>
  </div>;
}
