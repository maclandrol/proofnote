# Contributing

Corrections are the most useful contribution: a report that is wrong, a repair that does not work, or an earlier correction that was missed.

## Report a problem

Open an issue with:

1. The paper, its version, and the exact theorem, lemma or equation.
2. What you dispute and the assumptions involved.
3. Your argument: a derivation, a counterexample, or a primary source. Runnable code helps.
4. Which conclusions are affected, keeping theoretical and experimental consequences separate.
5. Any AI assistance, and which steps you checked yourself.

Discuss the mathematics and the evidence, not the researchers.

## Change the records

Edit the records in `data/`, then rebuild and run the checks as described in the [README](README.md#change-the-data) before opening a pull request. A few rules keep the collection consistent:

- One assessment per claim, with the statement, assumptions, evidence, consequences and possible repair.
- Only established errors are graded as issues. Read the full statement, definitions and assumptions first; a calculation against a stronger reading than the paper's is not an error in the paper.
- A follow-up must point to a later version or a separate source that treats the exact issue. An appendix of the original paper does not count.
- When a finding is corrected or withdrawn, say what changed and cite the source that changed it.

Changes are reviewed before merging. An open issue is not an endorsement or a confirmed correction.
