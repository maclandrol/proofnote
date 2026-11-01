"use client";

import { useState } from "react";
import { InlineText, RichText } from "./RichText";

export function Reasoning({ steps }: { steps: { title: string; text: string; math?: string }[] }) {
  const [focused, setFocused] = useState<number | null>(null);
  return <div className="pa-reasoning">
    <div className="pa-reasoning-toolbar"><span>{focused === null ? `${steps.length} steps` : `Step ${focused + 1} of ${steps.length}`}</span><button onClick={() => setFocused(focused === null ? 0 : null)}>{focused === null ? "Read one step at a time →" : "Show all steps"}</button></div>
    <ol className="pa-steps">
      {steps.map((step, i) => <li key={i} hidden={focused !== null && focused !== i}><span className="pa-step-number">{String(i + 1).padStart(2, "0")}</span><div>{step.title && <h4><InlineText text={step.title} /></h4>}<RichText text={step.text} />{step.math && <div className="pa-math" dangerouslySetInnerHTML={{ __html: step.math }} />}</div></li>)}
    </ol>
    {focused !== null && <div className="pa-step-navigation"><button disabled={focused === 0} onClick={() => setFocused(focused - 1)}>← Previous</button><div className="pa-progress-dots" aria-hidden="true">{steps.map((_, i) => <span key={i} className={i === focused ? "selected" : ""} />)}</div><button disabled={focused === steps.length - 1} onClick={() => setFocused(focused + 1)}>Next →</button></div>}
  </div>;
}
