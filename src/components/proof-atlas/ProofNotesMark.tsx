/** The Proof Notes logo, shown discreetly on papers whose authors fixed a finding after Proof Notes flagged it. */
export function ProofNotesMark({ date }: { date: string }) {
  const label = `Fixed after Proof Notes flagged it (revision uploaded ${date.slice(0, 10)})`;
  return <svg className="pa-pn-mark" viewBox="0 0 64 64" role="img" aria-label={label}><title>{label}</title><rect width="64" height="64" rx="14" fill="#713345" /><rect x="22" y="18" width="20" height="28" fill="#faf9f6" /></svg>;
}
