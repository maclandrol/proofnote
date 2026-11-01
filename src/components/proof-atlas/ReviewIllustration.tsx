"use client";
import { useState, type ReactNode } from "react";

/** Figures for published critical findings whose counterexample is easiest to grasp visually. Each draws the report's own witness. */
export const reviewIllustrations = {
  "SUS26-152993-02": "quantile-marginals",
  "SUS26-150842-01": "block-subgradients",
  "SUS26-151409-01": "prism-common-neighbours",
  "SUS26-152431-02": "weighted-gradients",
  "SUS26-151465-01": "guidance-return",
  "SUS26-155962-01": "grpo-auc",
} as const;
type Kind = typeof reviewIllustrations[keyof typeof reviewIllustrations];

// Same conventions as ClaimIllustration: solid teal for what actually happens, dashed rust for the claim or the
// competing construction, marks decoded in the caption's first sentence and values labelled on the figure.
const teal = "var(--pa-teal)", rust = "var(--pa-rust)";

function Figure({ kind, label, title, values, children, caption }: { kind: Kind; label: string; title: string; values?: [string, string][]; children: ReactNode; caption: [string, string] }) {
  return <figure className="pa-demo pa-illustration" data-illustration={kind}>
    <div className="pa-demo-title"><span className="pa-mini-label">{label}</span><h3>{title}</h3></div>
    {children}
    {values && <div className="pa-demo-values">{values.map(([name, value]) => <div key={name}><span>{name}</span><strong className="pa-demo-neutral">{value}</strong></div>)}</div>}
    <figcaption><p>{caption[0]}</p><p>{caption[1]}</p></figcaption>
  </figure>;
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="pa-slider"><span>{label}</span><output>{value.toFixed(1)}</output><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

function QuantileMarginals() {
  const a = [-.6, 0, .3], b = [0, .3, -.6];
  const panel = (i: number, title: string, target: number, source: number) => {
    const x0 = 24 + i * 134, x = (u: number) => x0 + 112 * u, y = (d: number) => 200 - 70 * d;
    return <g key={title}>
      <path d={`M${x0} ${y(0)}H${x0 + 112}`} stroke="currentColor" strokeOpacity=".3" />
      <path d={`M${x0} ${y(1)}H${x0 + 112}`} stroke="currentColor" strokeOpacity=".12" />
      <line x1={x(0)} y1={y(1 - target)} x2={x(1)} y2={y(1 + target)} stroke={teal} strokeWidth="2.5" />
      <line x1={x(0)} y1={y(1 - source)} x2={x(1)} y2={y(1 + source)} stroke={rust} strokeWidth="2.5" strokeDasharray="6 5" />
      <text x={x0 + 56} y="36" textAnchor="middle">{title}</text>
      <text x={x0} y="222">0</text><text x={x0 + 112} y="222" textAnchor="end">1</text>
    </g>;
  };
  return <Figure kind="quantile-marginals" label="Exact counterexample" title="Equal response marginals, different conditional laws"
    values={[["Marginal Wasserstein distance", "0"], ["Excess prediction risk", "7/600 ≈ 0.0117"]]}
    caption={["Solid: target conditional density. Dashed: source conditional density. Each panel spans responses y from 0 to 1; the faint line marks density one. The source permutes the target slopes (−0.6, 0, 0.3) across x, so both domains average to the marginal 1 − 0.1(2y − 1) in the last panel.",
      "The theorem’s transfer term compares only that marginal and records no mismatch. Predicting with the source conditional means still costs 7/600 in squared-loss risk, and the expected conditional W₁ distance is 1/10."]}>
    <div className="pa-figure-scroll"><svg viewBox="0 0 560 232" role="img" aria-labelledby="qm-title qm-desc">
      <title id="qm-title">Conditional response densities for three covariate values and the shared marginal</title>
      <desc id="qm-desc">Target slopes are minus 0.6, 0 and 0.3; source slopes are 0, 0.3 and minus 0.6. The two marginal densities coincide.</desc>
      {a.map((ax, i) => panel(i, `x = ${i}`, ax, b[i]))}
      {panel(3, "Marginal", -.1, -.1)}
    </svg></div>
  </Figure>;
}

function BlockSubgradients() {
  const s = 150, ox = 330, oy = 70, p = (u: number, v: number) => [ox + s * u, oy - s * v];
  const [c00, c10, c01, c11, mid] = [p(0, 0), p(-1, 0), p(0, -1), p(-1, -1), p(-.5, -.5)];
  return <Figure kind="block-subgradients" label="Illustration" title="Valid block choices need not form a subgradient"
    values={[["Iterate after every update", "(0, 0)"], ["Clarke residual", "1/2"]]}
    caption={["Shaded square: pairs of independently chosen block subgradients of h = max(−x, −y) at the origin. Solid diagonal: the full subdifferential of h there. Dashed segment: distance from the chosen pair to that diagonal.",
      "For f = ½(x² + y²) + min(x, y) = g − h, choosing zero in each block is allowed and makes every block model minimized at zero, so the method never moves. The pair (0, 0) is not a subgradient of h, and its squared distance ½ to the diagonal is the stationarity residual the theorem claims vanishes."]}>
    <div className="pa-figure-scroll"><svg viewBox="0 0 560 262" role="img" aria-labelledby="bs-title bs-desc">
      <title id="bs-title">Independent block subgradients versus the full subdifferential of h at the origin</title>
      <desc id="bs-desc">The square from minus one to zero in both coordinates contains the chosen point at the origin. The full subdifferential is the segment from minus one, zero to zero, minus one. Its nearest point is minus one half, minus one half.</desc>
      <rect x={c11[0]} y={c00[1]} width={s} height={s} fill={teal} opacity=".07" />
      <path d={`M${p(-1.35, 0).join(" ")}H${p(.35, 0)[0]}M${p(0, .3).join(" ")}V${p(0, -1.35)[1]}`} stroke="currentColor" strokeOpacity=".3" />
      <text x={p(.35, 0)[0] + 8} y={oy + 5}>x-block</text><text x={ox + 10} y={p(0, .3)[1] + 12}>y-block</text>
      <line x1={c10[0]} y1={c10[1]} x2={c01[0]} y2={c01[1]} stroke={teal} strokeWidth="2.5" />
      <line x1={c00[0]} y1={c00[1]} x2={mid[0]} y2={mid[1]} stroke={rust} strokeWidth="2.5" strokeDasharray="6 5" />
      <circle cx={mid[0]} cy={mid[1]} r="4" fill={teal} />
      <rect x={c00[0] - 5} y={c00[1] - 5} width="10" height="10" fill="var(--pa-paper)" stroke={rust} strokeWidth="2" />
      <text x={c00[0] + 12} y={c00[1] + 26}>chosen (0, 0)</text>
      <text x={c10[0] - 8} y={c10[1] - 10} textAnchor="end">(−1, 0)</text><text x={c01[0] + 10} y={c01[1] + 20}>(0, −1)</text>
      <text x={mid[0] - 10} y={mid[1] + 22} textAnchor="end">(−½, −½)</text>
      <text x={(c00[0] + mid[0]) / 2 + 10} y={(c00[1] + mid[1]) / 2 + 4} fill={rust}>√½</text>
    </svg></div>
  </Figure>;
}

function PrismCommonNeighbours() {
  const nodes = [[280, 30], [110, 230], [450, 230], [280, 108], [205, 190], [355, 190]];
  const edges = [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]];
  const style = (e: number[]) => e.join() === "0,1" ? { stroke: teal, strokeWidth: 3.5 } : e.join() === "0,3" ? { stroke: rust, strokeWidth: 3.5, strokeDasharray: "6 5" } : { stroke: "currentColor", strokeOpacity: .3, strokeWidth: 1.5 };
  return <Figure kind="prism-common-neighbours" label="Illustration" title="Two edges that shortest paths cannot tell apart"
    values={[["Shortest-path input, both edges", "(x, x)"], ["Common neighbours", "1 versus 0"]]}
    caption={["Solid: triangle edge (0, 1). Dashed: rung (0, 3). Every vertex starts with the same feature, and the prism is vertex-transitive, so an equivariant encoder gives every vertex the same embedding x.",
      "Each highlighted edge is its own shortest path, so both are represented by the same sequence (x, x). Vertex 2 is a common neighbour of 0 and 1, while 0 and 3 share none: a common-neighbour model separates the two edges, and no shortest-path representation can."]}>
    <div className="pa-figure-scroll"><svg viewBox="0 0 560 274" role="img" aria-labelledby="pr-title pr-desc">
      <title id="pr-title">Triangular prism with a triangle edge and a rung highlighted</title>
      <desc id="pr-desc">Outer triangle 0, 1, 2 and inner triangle 3, 4, 5, joined by rungs. Edge 0 to 1 has common neighbour 2; edge 0 to 3 has none.</desc>
      {edges.map(e => <line key={e.join()} x1={nodes[e[0]][0]} y1={nodes[e[0]][1]} x2={nodes[e[1]][0]} y2={nodes[e[1]][1]} {...style(e)} />)}
      {nodes.map(([cx, cy], i) => <g key={i}><circle cx={cx} cy={cy} r="16" fill="var(--pa-paper)" stroke={i === 2 ? teal : "currentColor"} strokeWidth="2" /><text x={cx} y={cy + 5} textAnchor="middle">{i}</text></g>)}
      <text x="24" y="112" fill={teal}><tspan x="24">1 common</tspan><tspan x="24" dy="22">neighbour</tspan></text>
      <text x="292" y="74" fill={rust}>no common neighbour</text>
      <text x="280" y="258" textAnchor="middle">same embedding x at every vertex</text>
    </svg></div>
  </Figure>;
}

function WeightedGradients() {
  const [lambda, setLambda] = useState(1);
  const g = [.5 * (1 + .2 * lambda), .5 * (1 - .2 * lambda)], h = [g[1], g[0]];
  const s = 300, o = [70, 236], p = (v: number[]) => [o[0] + s * v[0], o[1] - s * v[1]];
  const angle = Math.abs(Math.atan2(g[1], g[0]) - Math.atan2(h[1], h[0])) * 180 / Math.PI;
  const arrow = (v: number[], stroke: string, dashed = false, width = 2.5) => <line x1={o[0]} y1={o[1]} x2={p(v)[0]} y2={p(v)[1]} stroke={stroke} strokeWidth={width} strokeDasharray={dashed ? "6 5" : undefined} markerEnd="url(#wg-arrow)" />;
  return <Figure kind="weighted-gradients" label="Illustration" title="Positive weights still turn the summed gradient"
    values={[["Angle between the updates", `${angle.toFixed(1)}°`], ["Determinant", (.2 * lambda).toFixed(2)]]}
    caption={["Thin arrows: the two token score vectors, each with advantage one. Solid: the sum weighted by (1 + 0.2λ, 1 − 0.2λ). Dashed: the sum with the weights swapped. Every weight stays positive, so no token changes sign.",
      "For every λ > 0 the two sums point in different directions; at λ = 1 they are (0.6, 0.4) and (0.4, 0.6). Preserving each scalar sign does not preserve the direction of the aggregate policy gradient."]}>
    <div className="pa-figure-scroll"><svg viewBox="0 0 560 272" role="img" aria-labelledby="wg-title wg-desc">
      <title id="wg-title">Two positively weighted sums of the same score vectors</title>
      <desc id="wg-desc">With mixing coefficient {lambda.toFixed(1)}, the sums are ({g[0].toFixed(2)}, {g[1].toFixed(2)}) and ({h[0].toFixed(2)}, {h[1].toFixed(2)}).</desc>
      <defs><marker id="wg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke" /></marker></defs>
      <path d={`M${o[0]} 20V${o[1]}H540`} fill="none" stroke="currentColor" strokeOpacity=".3" />
      {arrow([.5, 0], "currentColor", false, 1.5)}{arrow([0, .5], "currentColor", false, 1.5)}
      {arrow(g, teal)}{arrow(h, rust, true)}
      <text x={p(g)[0] + 10} y={p(g)[1] + 6}>({g[0].toFixed(2)}, {g[1].toFixed(2)})</text>
      <text x={p(h)[0] + 10} y={p(h)[1]}>({h[0].toFixed(2)}, {h[1].toFixed(2)})</text>
      <text x={p([.5, 0])[0]} y={o[1] + 22} textAnchor="middle">(½, 0)</text><text x={o[0] - 8} y={p([0, .5])[1] + 5} textAnchor="end">(0, ½)</text>
    </svg></div>
    <Slider label="Mixing coefficient λ" value={lambda} min={0} max={2} step={.1} onChange={setLambda} />
  </Figure>;
}

function guidanceValue(w: number) {
  const f = (x: number) => 1 / (1 + Math.exp(-x));
  const p = f(.1 * w), q = .01 * f(9.9) ** w / (.01 * f(9.9) ** w + .99 * f(-.1) ** w);
  return (.2 * p + .9 * (1 - p) * 100 * q) / (1 - .9 * p);
}

function GuidanceReturn() {
  const [w, setW] = useState(20);
  const x = (v: number) => 60 + 16 * v, y = (v: number) => 216 - 2.4 * v;
  const curve = Array.from({ length: 301 }, (_, i) => `${x(i / 10)},${y(guidanceValue(i / 10))}`).join(" ");
  return <Figure kind="guidance-return" label="Exact counterexample" title="More guidance can lower the return"
    values={[[`Return at w = ${w.toFixed(1)}`, guidanceValue(w).toFixed(2)], ["Return at w = 10", guidanceValue(10).toFixed(2)]]}
    caption={["Solid curve: exact return from state 0 of the guided policy, for guidance weights w from 0 to 30. Filled circle: w = 10. Open square: the slider setting. Dashed line: the reference policy’s return, 1.",
      "Two states, γ = 0.9: at state 0, action a pays 0.2 and stays while b moves to state 1, where a pays 10 forever. Tilting the reference policy by f(A)ʷ with its own advantages raises the return until w ≈ 10.8, then lowers it. The theorem claims the return increases with w; only that monotonicity fails, since every value still beats the reference."]}>
    <div className="pa-figure-scroll"><svg viewBox="0 0 560 250" role="img" aria-labelledby="gr-title gr-desc">
      <title id="gr-title">Return of the guided policy as a function of the guidance weight</title>
      <desc id="gr-desc">The return rises from 1 at w equals 0 to about 67.8 near w equals 10.8, then falls to about 31 at w equals 30. At w equals {w.toFixed(1)} it is {guidanceValue(w).toFixed(2)}.</desc>
      {[0, 20, 40, 60, 80].map(v => <g key={v}><path d={`M60 ${y(v)}H540`} stroke="currentColor" strokeOpacity=".08" /><text x="50" y={y(v) + 5} textAnchor="end">{v}</text></g>)}
      {[0, 10, 20, 30].map(v => <text key={v} x={x(v)} y="240" textAnchor={v === 30 ? "end" : v === 0 ? "start" : "middle"}>w = {v}</text>)}
      <text x="60" y="20">Return from state 0</text>
      <path d={`M60 ${y(1)}H540`} stroke={rust} strokeWidth="2" strokeDasharray="6 5" />
      <polyline points={curve} fill="none" stroke={teal} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(10)} cy={y(guidanceValue(10))} r="4.5" fill={teal} />
      <text x={x(10)} y={y(guidanceValue(10)) - 12} textAnchor="middle">{guidanceValue(10).toFixed(2)}</text>
      <rect x={x(w) - 5} y={y(guidanceValue(w)) - 5} width="10" height="10" fill="var(--pa-paper)" stroke={rust} strokeWidth="2" />
    </svg></div>
    <Slider label="Guidance weight w" value={w} min={0} max={30} step={.5} onChange={setW} />
  </Figure>;
}

function GrpoAuc() {
  const items = ["00", "01", "10", "11"], A = [.2601, .2499, .245, .245], B = [.258, .342, .2, .2];
  const y = (v: number) => 212 - 420 * v;
  return <Figure kind="grpo-auc" label="Exact counterexample" title="The objective rises while the ranking gets worse"
    values={[["GRPO objective, A → B", "0.0115 → 0.0173"], ["Item-level AUC, A → B", "1 → 2/3"]]}
    caption={["Filled bars: item probabilities under policy A. Dashed outlines: under policy B. One user and four length-two sequences; only 00 has reward one, and every token likelihood ratio stays inside the clipping range.",
      "Moving from A to B raises the objective in Equation (7), yet item 01 now outranks the rewarded item, so AUC falls from 1 to 2/3. The token-averaged surrogate does not track the sequence probability that determines the ranking."]}>
    <div className="pa-figure-scroll"><svg viewBox="0 0 560 250" role="img" aria-labelledby="ga-title ga-desc">
      <title id="ga-title">Item probabilities under two policies</title>
      <desc id="ga-desc">Policy A gives 0.2601, 0.2499, 0.245 and 0.245. Policy B gives 0.258, 0.342, 0.2 and 0.2. The rewarded item is 00.</desc>
      {[0, .1, .2, .3].map(v => <g key={v}><path d={`M60 ${y(v)}H540`} stroke="currentColor" strokeOpacity=".08" /><text x="50" y={y(v) + 5} textAnchor="end">{v.toFixed(1)}</text></g>)}
      <text x="60" y="22">Item probability</text>
      {items.map((item, i) => <g key={item}>
        <rect x={80 + i * 118} y={y(A[i])} width="40" height={212 - y(A[i])} fill={teal} fillOpacity={i === 0 ? .9 : .45} />
        <rect x={124 + i * 118} y={y(B[i])} width="40" height={212 - y(B[i])} fill="none" stroke={rust} strokeWidth="2" strokeDasharray="6 5" />
        {i < 2 && <><text x={100 + i * 118} y={y(A[i]) - 8} textAnchor="middle" fontSize="13">{A[i]}</text><text x={144 + i * 118} y={y(B[i]) - 8} textAnchor="middle" fontSize="13">{B[i]}</text></>}
        <text x={122 + i * 118} y="236" textAnchor="middle">{i === 0 ? "00 · rewarded" : item}</text>
      </g>)}
    </svg></div>
  </Figure>;
}

export function ReviewIllustration({ checkId }: { checkId: string }) {
  const kind = Object.hasOwn(reviewIllustrations, checkId) ? reviewIllustrations[checkId as keyof typeof reviewIllustrations] : null;
  if (kind === "quantile-marginals") return <QuantileMarginals />;
  if (kind === "block-subgradients") return <BlockSubgradients />;
  if (kind === "prism-common-neighbours") return <PrismCommonNeighbours />;
  if (kind === "weighted-gradients") return <WeightedGradients />;
  if (kind === "guidance-return") return <GuidanceReturn />;
  if (kind === "grpo-auc") return <GrpoAuc />;
  return null;
}
