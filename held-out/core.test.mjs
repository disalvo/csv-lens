import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, summarise, topGroups } from "../src/csv.mjs";

test("quoted field keeps its comma", () => {
  const rows = parseCsv('name,addr\nana,"1 Main St, Apt 4"\n');
  assert.deepEqual(rows, [{ name: "ana", addr: "1 Main St, Apt 4" }]);
});

test("quoted field keeps a newline and a doubled quote", () => {
  const q = String.fromCharCode(34);
  const csv = "name,note\nana," + q + "line one\nline " + q + q + "two" + q + q + q + "\n";
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].note, "line one\nline " + q + "two" + q);
});

test("CRLF is a line ending, not part of a cell", () => {
  const rows = parseCsv("team,price\r\na,10\r\n");
  assert.deepEqual(rows, [{ team: "a", price: "10" }]);
});

test("BOM never reaches the first key", () => {
  const rows = parseCsv("\ufeffteam,price\na,10\n");
  assert.deepEqual(Object.keys(rows[0]), ["team", "price"]);
});

test("a short row throws with its physical line number", () => {
  assert.throws(() => parseCsv("team,price\na,10\nb\n"), (e) => e instanceof RangeError && /\b3\b/.test(e.message));
});

test("a long row throws as well", () => {
  assert.throws(() => parseCsv("team,price\na,10,extra\n"), (e) => e instanceof RangeError);
});

test("floats are rounded to six places", () => {
  const s = summarise(parseCsv("t,p\na,0.1\na,0.2\n"), { valueKey: "p", groupKey: "t" });
  assert.equal(s.total, 0.3);
  assert.equal(s.groups.a.total, 0.3);
});
