"use client";
import { useState } from "react";

function Chart({ points, reference, label, yMax, xRange, marker }: { points: [number, number][]; reference?: [number, number][]; label: string; yMax: number; xRange: [number, number]; marker?: [number, number] }) {
  const line = (p: [number, number][]) => p.map(([x, y]) => `${42 + x * 500},${176 - y / yMax * 140}`).join(" ");
  return <svg viewBox="0 0 570 205" role="img" aria-label={label} className="pa-demo-chart">
    <path d="M42 25V176H550" fill="none" stroke="currentColor" opacity=".2" />
    {[0, .5, 1].map(t => <g key={t}><path d={`M42 ${176-t*140}H550`} stroke="currentColor" opacity=".08" /><text x="31" y={181-t*140} textAnchor="end" fill="currentColor" fontSize="11">{(t*yMax).toFixed(1)}</text></g>)}
    {reference && <polyline points={line(reference)} fill="none" stroke="var(--pa-rust)" strokeWidth="2" strokeDasharray="5 5" />}
    <polyline points={line(points)} fill="none" stroke="var(--pa-teal)" strokeWidth="2.5" strokeLinejoin="round" />
    {[0, .5, 1].map(t => <text key={t} x={42+t*500} y="198" textAnchor="middle" fill="currentColor" fontSize="11">{Number((xRange[0]+t*(xRange[1]-xRange[0])).toFixed(3))}</text>)}
    {marker && <circle cx={42+marker[0]*500} cy={176-marker[1]/yMax*140} r="4.5" fill="var(--pa-paper)" stroke="var(--pa-teal)" strokeWidth="2" />}
  </svg>;
}

export function Witness({ kind }: { kind: "jump" | "infovae" | "dps" | "cql" | "numerics" }) {
  const [value, setValue] = useState(kind === "jump" ? .2 : kind === "dps" ? .1 : 1);
  let title: string, label: string, explanation: string, first: [string, string], second: [string, string], min: number, max: number, step: number;
  let chart: React.ReactNode;
  if (kind === "jump") {
    title = "Uniform and integrated approximation error"; label = "Transition half-width δ"; min=.02; max=.5; step=.01;
    first = ["Worst-case error", "0.500"]; second=["Integrated absolute error", (value/2).toFixed(3)];
    explanation = "The solid curve is a continuous ramp approximating a unit step (dashed). A narrower ramp reduces the area of error. It never removes the half-unit error beside the jump. This illustrates the obstruction; the proof applies to every continuous approximant.";
    chart = <Chart points={Array.from({length:201}, (_,i) => { const x=i/100-1;return [i/200,Math.max(0,Math.min(1,.5+x/(2*value)))]; })} reference={[[0,0],[.5,0],[.5,1],[1,1]]} yMax={1} xRange={[-1,1]} label="Continuous ramp approaches a discontinuous step; error near the jump remains one half." />;
  } else if (kind === "infovae") {
    title="InfoVAE objective under a Gaussian mean shift"; label="Gaussian mean shift m"; min=0;max=4;step=.1;
    first=["KL from the prior", (value*value/2).toFixed(3)]; second=["Objective gain", (value*value/4).toFixed(3)];
    explanation="With α = 0, λ = ½ and D = 3 KL, moving the encoder away from its prior improves the objective. The decoder and mutual information stay unchanged. The displayed gain is relative to the matching configuration m = 0.";
    chart=<Chart points={Array.from({length:81},(_,i)=>[i/80,(4*i/80)**2/4])} yMax={4} xRange={[0,4]} marker={[value/4,value*value/4]} label="Objective gain grows quadratically with Gaussian mean shift from zero to four." />;
  } else if (kind === "dps") {
    title="Noise dependence of the signed Jensen gap";label="Noise standard deviation σ"; min=.05; max=.5; step=.01;
    const actual=(Math.exp(-1)/Math.sqrt(4*Math.PI)-Math.exp(-2)/Math.sqrt(2*Math.PI))/value;
    const printed=Math.exp(-1/(2*value*value))/Math.PI;
    first=["Exact signed Jensen gap",actual.toFixed(4)];second=["Printed upper bound",printed.toExponential(2)];
    explanation="Set y = 2σ and X₀ | Xₜ = 0 ∼ N(0, σ²), with identity measurement. The gap is E[p(y | X₀)] − p(y | E[X₀]), exactly the paper’s signed convention. Every setting shown violates the printed upper bound. This tests a density bound, not reconstruction quality.";
    chart=<Chart points={Array.from({length:91},(_,i)=> {const s=.05+.45*i/90;return [i/90,(Math.exp(-1)/Math.sqrt(4*Math.PI)-Math.exp(-2)/Math.sqrt(2*Math.PI))/s];})} reference={Array.from({length:91},(_,i)=> {const s=.05+.45*i/90;return [i/90,Math.exp(-1/(2*s*s))/Math.PI];})} yMax={1} xRange={[.05,.5]} marker={[(value-.05)/.45,actual]} label="Exact signed gap stays above the printed bound as noise standard deviation ranges from 0.05 to 0.5." />;
  } else if (kind === "numerics") {
    title="The proposed bound falls below the exact eigenvalue ratio";label="Regularization strength γ";min=.05;max=2;step=.05;
    first=["Exact ratio",(1/(1+2*value)).toFixed(4)];second=["Printed upper bound",(1/(1+4*value)).toFixed(4)];
    explanation="For A = −I + J, the regularized eigenvalues are −(1 + 2γ) ± i. Their imaginary-to-real ratio is 1/(1 + 2γ), while the printed bound is 1/(1 + 4γ). Every positive γ gives a contradiction. These are exact matrix calculations, not measured training rates.";
    chart=<Chart points={Array.from({length:81},(_,i)=>[i/80,1/(1+4*i/80)])} reference={Array.from({length:81},(_,i)=>[i/80,1/(1+8*i/80)])} yMax={1} xRange={[0,2]} marker={[value/2,1/(1+2*value)]} label="Exact eigenvalue ratio exceeds the claimed bound for every positive regularization strength. At gamma one, the values are one third and one fifth." />;
  } else {
    title="Policy value as a function of the CQL penalty"; label="Penalty strength α";min=0;max=3;step=.1;
    first=["True policy value", "1.100"]; second=["Value after one update",(1.1+.176*value).toFixed(3)];
    explanation="For the one-state, two-action example below, the target is already exact. The shared linear feature makes the policy-weighted penalty point in the wrong direction. Increasing its strength raises the estimated value above truth.";
    chart=<Chart points={[[0,1.1],[1,1.628]]} reference={[[0,1.1],[1,1.1]]} yMax={2} xRange={[0,3]} marker={[value/3,1.1+.176*value]} label="The fitted policy value increases from 1.1 to 1.628 while the true value remains 1.1." />;
  }
  return <div className="pa-demo" data-witness={kind}><div className="pa-demo-title"><span className="pa-mini-label">Numerical illustration</span><h3>{title}</h3></div>{chart}
    <label className="pa-slider"><span>{label}</span><output>{value.toFixed(2)}</output><input type="range" min={min} max={max} step={step} value={value} onChange={e=>setValue(Number(e.target.value))} /></label>
    <div className="pa-demo-values"><div><span>{first[0]}</span><strong>{first[1]}</strong></div><div><span>{second[0]}</span><strong>{second[1]}</strong></div></div><p>{explanation}</p>
    <p className="pa-demo-caption">{kind === "jump" ? "Horizontal axis: x from −1 to 1. Vertical axis: function value." : kind === "infovae" ? "Curve: objective gain for m from 0 to 4. The slider evaluates the marked point." : kind === "dps" ? "Solid: exact gap. Dashed: printed bound. Horizontal axis: σ from 0.05 to 0.5." : kind === "numerics" ? "Solid: exact ratio. Dashed: printed bound. Horizontal axis: γ from 0 to 2. Zero is shown only as the unregularized limit." : "Solid: updated value. Dashed: true value. Horizontal axis: α from 0 to 3."}</p>
  </div>;
}
