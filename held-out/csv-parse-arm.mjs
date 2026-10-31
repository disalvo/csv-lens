// The "batteries" arm for EP8: the same contract, implemented on csv-parse + csv-stringify-free path.
import { parse } from "csv-parse/sync";
import { fixture, bench } from "./perf.mjs";

const round6 = (n) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

function parseCsv(text) {
  const records = parse(text, { columns: true, skip_empty_lines: false, bom: true, relax_column_count: false });
  return records;
}

function summarise(records, { valueKey, groupKey }) {
  const out = { count: 0, total: 0, mean: 0, groups: {} };
  for (const [i, r] of records.entries()) {
    const raw = r[valueKey];
    const t = String(raw).trim();
    if (t !== "" && !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) throw new TypeError(`record ${i}`);
    const v = t === "" ? 0 : Number(t);
    const g = r[groupKey] === undefined ? "" : r[groupKey];
    out.count++;
    out.total += v;
    out.groups[g] ??= { count: 0, total: 0, mean: 0 };
    out.groups[g].count++;
    out.groups[g].total += v;
  }
  out.total = round6(out.total);
  out.mean = round6(out.total / out.count || 0);
  for (const g of Object.values(out.groups)) {
    g.total = round6(g.total);
    g.mean = round6(g.total / g.count);
  }
  return out;
}

const text = fixture();
console.log(JSON.stringify({ arm: "csv-parse", ...bench(parseCsv, summarise, text) }));
