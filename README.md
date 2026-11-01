# Proof Notes

Frontier LLMs check the mathematical claims in machine learning papers and, where possible, propose repairs.

**[proofnote.enoutahi.com](https://proofnote.enoutahi.com)** · [How it works](https://proofnote.enoutahi.com/methodology) · [Data](https://proofnote.enoutahi.com/contribute)

The index covers 5,212 papers: 4,876 accepted at NeurIPS 2026 and 336 from earlier collections. Each paper links to a report that states the claim, what fails, the evidence, its severity, the consequences and a possible repair, with links to the paper and sources. A smaller set of detailed notes add full derivations, interactive figures and scripts that recompute their counterexamples.

The analyses, explanations and checks were produced by GPT 6.1 Sol, Claude and DeepSeek. Most have not been verified by a human. Each assessment covers the claims it examines, not every proof or experiment in a paper.

## Repository

| Path | Contents |
| --- | --- |
| `src/` | The site |
| `data/` | The records behind the reports and the counterexample scripts |
| `scripts/` | Build and validation scripts |

## Run locally

```sh
npm ci
npm run dev
```

## Change the data

Edit the records in `data/`, then rebuild and run the checks:

```sh
npm run build
node scripts/check-app.mjs
```

## Contributing

Corrections are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Third-party papers and metadata keep their original rights; a licence for this repository has not been chosen yet.
