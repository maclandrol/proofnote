import Link from "next/link";
import { CatalogueLink } from "./proof-atlas/CatalogueLink";

const repository = "https://github.com/maclandrol/proofnote";

export function AppFooter() {
  return <footer className="pn-footer">
    <div className="pn-footer-inner">
      <div className="pn-footer-about">
        <CatalogueLink className="pn-brand">Proof Notes</CatalogueLink>
        <p>Frontier LLMs check the mathematical claims in machine learning papers and propose repairs. These are AI analyses; most have not been verified by a human.</p>
      </div>
      <nav aria-label="Site" className="pn-footer-links">
        <CatalogueLink>Papers</CatalogueLink>
        <Link href="/methodology">How it works</Link>
        <Link href="/contribute">Data</Link>
        <a href={`${repository}/issues/new`}>Report an error ↗</a>
        <a href={repository}>GitHub ↗</a>
      </nav>
    </div>
  </footer>;
}
