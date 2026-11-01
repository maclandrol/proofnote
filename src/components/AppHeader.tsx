import { CatalogueLink } from "./proof-atlas/CatalogueLink";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return <header className="pn-header"><nav aria-label="Proof Notes" className="pn-nav">
    <CatalogueLink className="pn-brand">Proof Notes</CatalogueLink>
    <ThemeToggle />
  </nav></header>;
}
