import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, summarise, topGroups } from "../src/csv.mjs";

// ---- parseCsv ----

test("contract: strips a UTF-8 BOM", () => {
  const rows = parseCsv("\ufeffteam,price\na,10\n");
  assert.deepEqual(rows, [{ team: "a", price: "10" }]);
});

test("contract: handles CRLF and does not keep \\r on cells", () => {
  const rows = parseCsv("a,b\r\n1,2\r\n");
  assert.deepEqual(rows, [{ a: "1", b: "2" }]);
});

test("contract: mixed line endings", () => {
  const rows = parseCsv("a,b\n1,2\r\n3,4\n");
  assert.deepEqual(rows, [
    { a: "1", b: "2" },
    { a: "3", b: "4" },
  ]);
});

test("contract: quoted comma is literal", () => {
  const rows = parseCsv('a,b\n"x,y",2\n');
  assert.deepEqual(rows, [{ a: "x,y", b: "2" }]);
});

test("contract: quoted newline is literal", () => {
  const rows = parseCsv('a,b\n"x\ny",2\n');
  assert.deepEqual(rows, [{ a: "x\ny", b: "2" }]);
});

test("contract: doubled quote is one quote", () => {
  const rows = parseCsv('a,b\n"x""y",2\n');
  assert.deepEqual(rows, [{ a: 'x"y', b: "2" }]);
});

test("contract: header keys are not trimmed", () => {
  const rows = parseCsv(" a , b \n1,2\n");
  assert.deepEqual(rows, [{ " a ": "1", " b ": "2" }]);
});

test("contract: whitespace-only text returns []", () => {
  assert.deepEqual(parseCsv("  \n\t\n "), []);
});

test("contract: row with wrong field count throws RangeError naming start line", () => {
  assert.throws(
    () => parseCsv("a,b\n1,2,3\n"),
    (err) => err instanceof RangeError && /line 2/.test(err.message)
  );
});

test("contract: row with wrong count after a quoted multi-line field names its start line", () => {
  assert.throws(
    () => parseCsv('a,b\n"1\n2",3,4\n'),
    (err) => err instanceof RangeError && /line 2/.test(err.message)
  );
});

// ---- summarise ----

test("contract: keys must be non-empty strings", () => {
  assert.throws(() => summarise([], { valueKey: "", groupKey: "g" }), TypeError);
  assert.throws(() => summarise([], { valueKey: "v", groupKey: "" }), TypeError);
  assert.throws(() => summarise([], { valueKey: 1, groupKey: "g" }), TypeError);
  assert.throws(() => summarise([], {}), TypeError);
});

test("contract: empty cell and missing key count as zero", () => {
  const s = summarise(
    [{ g: "a" }, { g: "b", v: "" }],
    { valueKey: "v", groupKey: "g" }
  );
  assert.equal(s.count, 2);
  assert.equal(s.total, 0);
  assert.equal(s.mean, 0);
});

test("contract: non-finite values throw naming the 0-based index", () => {
  assert.throws(
    () => summarise([{ v: "12px" }], { valueKey: "v", groupKey: "g" }),
    (err) => err instanceof TypeError && /index 0/.test(err.message)
  );
  assert.throws(
    () => summarise([{ v: "10" }, { v: "0x10" }], { valueKey: "v", groupKey: "g" }),
    (err) => err instanceof TypeError && /index 1/.test(err.message)
  );
  assert.throws(
    () => summarise([{ v: "1e" }], { valueKey: "v", groupKey: "g" }),
    TypeError
  );
  assert.throws(
    () => summarise([{ v: "NaN" }], { valueKey: "v", groupKey: "g" }),
    TypeError
  );
});

test("contract: total and mean are rounded to 6 decimals", () => {
  const s = summarise(
    [{ v: "0.1", g: "a" }, { v: "0.2", g: "a" }],
    { valueKey: "v", groupKey: "g" }
  );
  assert.equal(s.total, 0.3);
  assert.equal(s.groups.a.total, 0.3);
});

test("contract: missing group key maps to empty string", () => {
  const s = summarise([{ v: "5" }], { valueKey: "v", groupKey: "g" });
  assert.deepEqual(s.groups[""], { count: 1, total: 5, mean: 5 });
});

// ---- topGroups ----

test("contract: n must be an integer >= 1", () => {
  const s = { count: 0, total: 0, mean: 0, groups: {} };
  assert.throws(() => topGroups(s, 0), TypeError);
  assert.throws(() => topGroups(s, 1.5), TypeError);
  assert.throws(() => topGroups(s, "1"), TypeError);
});

test("contract: ties are broken by group ascending", () => {
  const summary = {
    count: 0,
    total: 0,
    mean: 0,
    groups: {
      b: { count: 1, total: 5, mean: 5 },
      a: { count: 1, total: 5, mean: 5 },
    },
  };
  assert.deepEqual(topGroups(summary, 2), [
    { group: "a", total: 5 },
    { group: "b", total: 5 },
  ]);
});

test("contract: returns at most n entries", () => {
  const summary = {
    count: 0,
    total: 0,
    mean: 0,
    groups: {
      a: { count: 1, total: 3, mean: 3 },
      b: { count: 1, total: 2, mean: 2 },
      c: { count: 1, total: 1, mean: 1 },
    },
  };
  assert.deepEqual(topGroups(summary, 2), [
    { group: "a", total: 3 },
    { group: "b", total: 2 },
  ]);
});
