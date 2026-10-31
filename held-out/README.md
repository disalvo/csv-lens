# Held-out suite (published after the round closed)

Copies of the checks the two agent runs were graded against. They are not part of
`npm test`: run them explicitly.

    node --test held-out/core.test.mjs held-out/edge.test.mjs

`perf.mjs` builds the 50,000-row fixture and times an implementation; the numbers in
the episode come from it (median of five runs, Node 22, one vCPU of a 2-vCPU VM).
`csv-parse-arm.mjs` is the library arm: `npm install csv-parse@7`, then run it.
