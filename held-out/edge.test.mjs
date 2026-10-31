import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, summarise, topGroups } from "../src/csv.mjs";

test("whitespace-only text has no rows", () => {
  assert.deepEqual(parseCsv("   \n\n"), []);
});

test("a non-numeric cell is a TypeError naming the record", () => {
  const rows = parseCsv("t,p\na,10\na,12px\n");
  assert.throws(() => summarise(rows, { valueKey: "p", groupKey: "t" }), (e) => e instanceof TypeError && /\b1\b/.test(e.message));
});

test("hex-looking and exponent-looking cells are not numbers", () => {
  for (const cell of ["0x10", "1e", "NaN", "Infinity"]) {
    const rows = parseCsv(`t,p\na,${cell}\n`);
    assert.throws(() => summarise(rows, { valueKey: "p", groupKey: "t" }), TypeError, cell);
  }
});

test("key arguments are validated", () => {
  assert.throws(() => summarise([], { valueKey: "", groupKey: "t" }), TypeError);
  assert.throws(() => summarise([], { valueKey: "p" }), TypeError);
});

test("ties break by group name, n is validated", () => {
  const rows = parseCsv("t,p\nb,5\na,5\nc,9\n");
  const s = summarise(rows, { valueKey: "p", groupKey: "t" });
  assert.deepEqual(topGroups(s, 2), [
    { group: "c", total: 9 },
    { group: "a", total: 5 },
  ]);
  assert.throws(() => topGroups(s, 0), TypeError);
  assert.throws(() => topGroups(s, 1.5), TypeError);
});
