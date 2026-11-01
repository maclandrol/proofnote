"use client";
import { useState } from "react";
import { InlineText, RichText } from "./RichText";

type IllustrationKind = "local-iterates" | "bear-actions" | "belief-conditioning" | "contracting-bound";

export function ClaimIllustration({ kind, decayRate = 1 }: { kind: IllustrationKind; decayRate?: 1 | .5 }) {
  const [perturbation, setPerturbation] = useState(.1);
  if (kind === "contracting-bound") {
    const x = (t: number) => 64 + 146 * t;
    const y = (logError: number) => 145 - 35 * logError;
    const curve = (logError: (t: number) => number) => Array.from({ length: 61 }, (_, i) => `${x(i / 20)},${y(logError(i / 20))}`).join(" ");
    return <figure className="pa-demo pa-illustration" data-illustration={kind}>
      <div className="pa-demo-title"><span className="pa-mini-label">Exact counterexample</span><h3>The error shrinks below the claimed lower bound</h3></div>
      <div className="pa-figure-scroll"><svg viewBox="0 0 560 300" role="img" aria-labelledby="contraction-title contraction-desc">
        <title id="contraction-title">Contracting error compared with the claimed growing lower bound</title>
        <desc id="contraction-desc">For scalar drift minus {decayRate} times s, exact squared error decreases exponentially. At t equals one it is approximately {Math.exp(-2 * decayRate).toFixed(4)}, while the claimed lower bound is {(1 + decayRate) ** 2}. The vertical axis is logarithmic.</desc>
        {[-3, -2, -1, 0, 1, 2].map(v => <g key={v}><path d={`M64 ${y(v)}H510`} stroke="currentColor" strokeOpacity=".15" /><text x="50" y={y(v) + 5} textAnchor="end">{10 ** v}</text></g>)}
        <text x="64" y="24">Squared error · logarithmic scale</text>
        <polyline points={curve(t => 2 * t * Math.log10(1 + decayRate))} fill="none" stroke="var(--pa-rust)" strokeWidth="2.5" strokeDasharray="6 5" />
        <polyline points={curve(t => -2 * decayRate * t / Math.LN10)} fill="none" stroke="var(--pa-teal)" strokeWidth="2.5" />
        {[0, 1, 2, 3].map(t => <text key={t} x={x(t)} y="277" textAnchor="middle">t = {t}</text>)}
        <text x="270" y="57" fill="var(--pa-rust)">Claimed lower bound: {(1 + decayRate) ** 2}ᵗ</text>
        <text x="270" y="243" fill="var(--pa-teal)">Exact squared error: {decayRate === 1 ? "e⁻²ᵗ" : "e⁻ᵗ"}</text>
      </svg></div>
      <div className="pa-demo-values"><div><span><InlineText text="Actual error at $t=1$" /></span><strong className="pa-demo-neutral">≈ {Math.exp(-2 * decayRate).toFixed(4)}</strong></div><div><span>Claimed lower bound</span><strong className="pa-demo-neutral">{(1 + decayRate) ** 2}</strong></div></div>
      <figcaption><RichText text={`Both curves start at one. The drift is $F(s)=-${decayRate === 1 ? "s" : "s/2"}$, with upper Lipschitz constant $${decayRate}$ and zero noise. This condition permits contraction and does not imply the lower bound shown by the dashed curve.`} /></figcaption>
    </figure>;
  }
  if (kind === "local-iterates") {
    const perturbed = [0, 2 + perturbation, -perturbation - 2000 * perturbation ** 3];
    const y = (w: number) => 170 - 52 * w;
    const points = (values: number[]) => values.map((w, i) => `${70 + 220 * i},${y(w)}`).join(" ");
    return <figure className="pa-demo pa-illustration" data-illustration={kind}>
      <div className="pa-demo-title"><span className="pa-mini-label">Illustration</span><h3>A small perturbation leaves [−2, 2]</h3></div>
      <div className="pa-figure-scroll"><svg viewBox="0 0 580 345" role="img" aria-labelledby="iterates-title iterates-desc">
        <title id="iterates-title">Exact and perturbed gradient descent, over two updates</title>
        <desc id="iterates-desc">The shaded band is minus two to two, where the gradient is one-Lipschitz. Exact iterates are zero, two, zero. The first update receives perturbation {perturbation.toFixed(3)}. The final perturbed iterate is {perturbed[2].toFixed(3)}, giving error {Math.abs(perturbed[2]).toFixed(3)} against the claimed upper bound 0.2.</desc>
        <rect x="48" y={y(2)} width="500" height={y(-2) - y(2)} fill="var(--pa-teal)" opacity=".07" />
        {[-2, 0, 2].map(w => <g key={w}><path d={`M48 ${y(w)}H548`} stroke="currentColor" opacity=".3" strokeDasharray={w ? "4 4" : undefined} /><text x="34" y={y(w) + 5} textAnchor="end">{w}</text></g>)}
        <text x="48" y="28">Iterate w</text>
        <polyline points={points([0, 2, 0])} fill="none" stroke="var(--pa-teal)" strokeWidth="2.5" strokeDasharray="6 5" />
        <polyline points={points(perturbed)} fill="none" stroke="var(--pa-rust)" strokeWidth="2.5" />
        {[0, 2, 0].map((w, i) => <rect key={i} x={65 + i * 220} y={y(w) - 5} width="10" height="10" fill="var(--pa-paper)" stroke="var(--pa-teal)" strokeWidth="2" />)}
        {perturbed.map((w, i) => <circle key={i} cx={70 + i * 220} cy={y(w)} r="4" fill="var(--pa-rust)" />)}
        <text x="273" y={y(2) + 22} textAnchor="end">2</text><text x="305" y={y(perturbed[1]) - 9}>{perturbed[1].toFixed(3)}</text>
        <text x="496" y={y(perturbed[2]) + 25} textAnchor="end">{perturbed[2].toFixed(3)}</text>
        {[0, 1, 2].map(k => <text key={k} x={70 + 220 * k} y="331" textAnchor="middle">k = {k}</text>)}
      </svg></div>
      <label className="pa-slider"><span>First-update perturbation e</span><output>{perturbation.toFixed(3)}</output><input type="range" min="0" max="0.1" step="0.005" value={perturbation} onChange={e => setPerturbation(Number(e.target.value))} /></label>
      <div className="pa-demo-values"><div><span>Final error</span><strong className="pa-demo-neutral">{Math.abs(perturbed[2]).toFixed(3)}</strong></div><div><span>Claimed upper bound 2ε</span><strong className="pa-demo-neutral">0.200</strong></div></div>
      <figcaption><p>Dashed squares: exact updates. Solid circles: perturbed updates. The shaded interval is the region where the gradient is 1-Lipschitz. The lemma’s parameters stay fixed at R = 2, η = 2 and ε = 0.1.</p><p>Every slider setting satisfies |e| ≤ ε; only the first update is perturbed. Any positive e leaves the shaded interval. At e = 0.1, the next iterate is −2.1 and the error bound fails. Smaller perturbations need not violate that bound. The objective remains differentiable outside the interval, but its stated Lipschitz bound no longer applies.</p></figcaption>
    </figure>;
  }

  if (kind === "bear-actions") {
    return <figure className="pa-demo pa-illustration" data-illustration={kind}>
      <div className="pa-demo-title"><span className="pa-mini-label">Illustration</span><h3>The lost reward occurs before the common next state</h3></div>
      <div className="pa-figure-scroll"><svg viewBox="0 0 580 270" role="img" aria-labelledby="bear-title bear-desc">
        <title id="bear-title">Two actions share an absorbing successor</title>
        <desc id="bear-desc">At state s0, action good pays one and action bad pays zero. Both lead to state s1, where every future reward is zero. The constrained policy can choose only bad. The action-value backups agree because their continuation values agree, but the constrained initial value is one lower.</desc>
        <defs><marker id="bear-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke" /></marker></defs>
        <path d="M121 121C190 15 348 15 421 121" fill="none" stroke="var(--pa-rust)" strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#bear-arrow)" />
        <path d="M121 149C190 255 348 255 421 149" fill="none" stroke="var(--pa-teal)" strokeWidth="2.5" markerEnd="url(#bear-arrow)" />
        <circle cx="89" cy="135" r="35" fill="var(--pa-paper)" stroke="currentColor" /><text x="89" y="141" textAnchor="middle">s₀</text>
        <circle cx="454" cy="135" r="35" fill="var(--pa-paper)" stroke="currentColor" /><text x="454" y="141" textAnchor="middle">s₁</text>
        <text x="270" y="30" textAnchor="middle">good · reward 1 · excluded by Π</text>
        <text x="270" y="250" textAnchor="middle">bad · reward 0 · allowed by Π</text>
        <text x="454" y="192" textAnchor="middle">Future rewards: 0</text>
      </svg></div>
      <figcaption><p>The two Q-backup operators agree for each action: both use a zero continuation value. That agreement does not measure the reward lost when the policy is restricted to the zero-reward action.</p><p>With γ = ½ and exact iteration (δ = 0), α<sub>Q</sub> = 0, yet V*(s₀) − V<sup>Π</sup>(s₀) = 1. This illustrates the suboptimality term; it does not test the full approximate-learning guarantee.</p></figcaption>
    </figure>;
  }

  const top = [280, 30], left = [80, 275], right = [480, 275];
  const point = (q: number[]) => [q[0] * top[0] + q[1] * left[0] + q[2] * right[0], q[0] * top[1] + q[1] * left[1] + q[2] * right[1]];
  const prior = point([1 / 3, 1 / 3, 1 / 3]);
  const exact = point([3 / 5, 1 / 5, 1 / 5]);
  const row = point([163 / 312, 149 / 624, 149 / 624]);
  return <figure className="pa-demo pa-illustration" data-illustration={kind}>
    <div className="pa-demo-title"><span className="pa-mini-label">Illustration</span><h3>Same direction, different posterior</h3></div>
    <div className="pa-figure-scroll"><svg viewBox="0 0 560 325" role="img" aria-labelledby="belief-title belief-desc">
      <title id="belief-title">The normalization discrepancy inside the probability simplex</title>
      <desc id="belief-desc">The triangle represents distributions over three states. From the uniform prior at its centre, both constructions move toward state one. The exact posterior is 0.6, 0.2, 0.2. Averaging row conditionals gives 163 over 312, 149 over 624, 149 over 624. Its distance from the centre is 295 over 416 of the exact displacement.</desc>
      <path d="M280 30L80 275H480Z" fill="var(--pa-teal)" fillOpacity=".04" stroke="currentColor" strokeOpacity=".4" />
      <text x="280" y="22" textAnchor="middle">State 1</text><text x="75" y="304" textAnchor="middle">State 2</text><text x="485" y="304" textAnchor="middle">State 3</text>
      <path d={`M${prior.join(" ")}L${exact.join(" ")}`} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={exact[0]} cy={exact[1]} r="5" fill="var(--pa-teal)" />
      <rect x={row[0] - 5} y={row[1] - 5} width="10" height="10" fill="var(--pa-paper)" stroke="var(--pa-rust)" strokeWidth="2" />
      <circle cx={prior[0]} cy={prior[1]} r="4" fill="var(--pa-paper)" stroke="currentColor" strokeWidth="2" />
      <path d={`M288 ${exact[1]}H363`} stroke="var(--pa-teal)" /><text x="369" y={exact[1] + 5}>Exact</text>
      <path d={`M272 ${row[1]}H180`} stroke="var(--pa-rust)" /><text x="174" y={row[1] + 5} textAnchor="end">Row average</text>
      <path d={`M288 ${prior[1]}H363`} stroke="currentColor" /><text x="369" y={prior[1] + 5}>Prior π</text>
    </svg></div>
    <figcaption><p>At α = 3/5 and x = 3/20, observing symbol 0 changes the posterior weights over predecessor states from (⅓, ⅓, ⅓) to (0.48, 0.26, 0.26). The plotted points describe the successor state. Averaging its row conditionals with the old weights gives the wrong posterior.</p><p>The points are collinear: the row average’s displacement from π is 295/416 of the exact displacement. A fitted linear map can absorb that common scale in this symmetric example. All points shown are valid probability vectors; negative coordinates are not the issue.</p></figcaption>
  </figure>;
}
