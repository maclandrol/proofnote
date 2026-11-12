import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const alt = "Proof Notes: checking theoretical claims in machine learning papers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const index = JSON.parse(readFileSync(join(process.cwd(), "public/data/proof-atlas/scanned-papers.json"), "utf8")) as { totalScanned: number; severities: Record<string, number> };
// Same order and palette as the severity bar on the index page.
const bands: [string, string][] = [["critical", "#a52b3c"], ["major", "#875009"], ["repairable", "#245e9c"], ["minor_cosmetic", "#535f73"], ["fixed", "#5b4a9e"], ["no_issues", "#c9d8cf"]];

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#faf9f6", color: "#252523", fontFamily: "serif" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 26, letterSpacing: 6, color: "#666762", textTransform: "uppercase" }}>Checking theoretical claims in ML</div>
        <div style={{ fontSize: 120, marginTop: 18, letterSpacing: -4 }}>Proof Notes.</div>
        <div style={{ fontSize: 36, marginTop: 10, color: "#666762" }}>Frontier LLMs check the maths in ML papers.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 18, borderRadius: 9, overflow: "hidden" }}>
          {bands.map(([key, color]) => <div key={key} style={{ flexGrow: index.severities[key] ?? 0, background: color }} />)}
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 28, color: "#666762" }}>{`${index.totalScanned.toLocaleString("en-US")} papers scanned · ${index.severities.critical} critical · ${index.severities.major.toLocaleString("en-US")} major`}</div>
      </div>
    </div>,
    size,
  );
}
