import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, summarise, topGroups } from "../src/csv.mjs";

test("reads a header and rows", () => {
  const rows = parseCsv("team,price\na,10\nb,5\n");
  assert.deepEqual(rows, [
    { team: "a", price: "10" },
    { team: "b", price: "5" },
  ]);
});

test("empty text has no rows", () => {
  assert.deepEqual(parseCsv(""), []);
});

test("totals and mean over the whole file", () => {
  const rows = parseCsv("team,price\na,10\nb,5\na,2.5\n");
  const s = summarise(rows, { valueKey: "price", groupKey: "team" });
  assert.equal(s.count, 3);
  assert.equal(s.total, 17.5);
  assert.equal(s.mean, 5.833333);
});

test("groups carry their own totals", () => {
  const rows = parseCsv("team,price\na,10\nb,5\na,2.5\n");
  const s = summarise(rows, { valueKey: "price", groupKey: "team" });
  assert.deepEqual(s.groups.a, { count: 2, total: 12.5, mean: 6.25 });
  assert.deepEqual(s.groups.b, { count: 1, total: 5, mean: 5 });
});

test("tops are sorted by total", () => {
  const rows = parseCsv("team,price\na,10\nb,5\na,2.5\n");
  const s = summarise(rows, { valueKey: "price", groupKey: "team" });
  assert.deepEqual(topGroups(s, 1), [{ group: "a", total: 12.5 }]);
  assert.deepEqual(topGroups(s, 5), [
    { group: "a", total: 12.5 },
    { group: "b", total: 5 },
  ]);
});

test("an empty cell counts as zero", () => {
  const rows = parseCsv("team,price\na,\n");
  const s = summarise(rows, { valueKey: "price", groupKey: "team" });
  assert.equal(s.total, 0);
  assert.equal(s.count, 1);
});

test("empty input summarises to zeros", () => {
  const s = summarise([], { valueKey: "price", groupKey: "team" });
  assert.deepEqual(s, { count: 0, total: 0, mean: 0, groups: {} });
});

test("top of an empty summary is empty", () => {
  assert.deepEqual(topGroups({ count: 0, total: 0, mean: 0, groups: {} }, 3), []);
});
