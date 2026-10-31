// csv-lens - RFC 4180 CSV reader plus summary helpers, matching README.md.

const round = (n) => {
  const r = Math.round(n * 1e6) / 1e6;
  return r === 0 ? 0 : r; // normalise -0 to 0
};

// A strict decimal number: sign, digits (with optional fraction), optional
// exponent. Rejects hex ("0x10"), trailing junk ("12px"), incomplete
// exponents ("1e") and non-numbers ("NaN") which Number() would otherwise
// accept or silently mangle.
const NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseCsv(text) {
  if (typeof text !== "string") {
    throw new TypeError("parseCsv: expected a string");
  }

  let src = text;
  if (src.charCodeAt(0) === 0xfeff) {
    src = src.slice(1); // strip UTF-8 BOM
  }
  if (src.trim() === "") {
    return []; // empty or whitespace-only
  }

  let i = 0;
  let line = 1; // 1-based physical line number of position i

  // Read a single field starting at i. Advances i (and `line` for any newline
  // characters consumed inside a quoted field).
  function parseField() {
    let value = "";
    if (i < src.length && src[i] === '"') {
      i++; // opening quote
      while (i < src.length) {
        const ch = src[i];
        if (ch === '"') {
          if (src[i + 1] === '"') {
            value += '"'; // doubled quote -> one literal quote
            i += 2;
          } else {
            i++; // closing quote
            return value;
          }
        } else {
          if (ch === "\n") line++;
          value += ch;
          i++;
        }
      }
      return value; // unterminated quoted field (lenient at EOF)
    }

    // Unquoted field: read until a comma or a line ending.
    while (i < src.length) {
      const ch = src[i];
      if (ch === "," || ch === "\n") break;
      if (ch === "\r") {
        if (src[i + 1] === "\n") break; // CRLF line ending
        value += ch; // lone CR is literal
        i++;
        continue;
      }
      value += ch;
      i++;
    }
    return value;
  }

  // Read one row (a sequence of fields separated by commas). Leaves i on the
  // line ending (or EOF) that terminates the row.
  function parseRow() {
    const fields = [];
    for (;;) {
      fields.push(parseField());
      if (i < src.length && src[i] === ",") {
        i++;
        continue;
      }
      break;
    }
    return fields;
  }

  // Consume a line ending at i, incrementing the physical line counter.
  function consumeLineEnding() {
    if (i < src.length && src[i] === "\r") {
      i++;
      if (i < src.length && src[i] === "\n") {
        i++;
        line++;
      } else {
        line++; // lone CR treated as a line ending
      }
    } else if (i < src.length && src[i] === "\n") {
      i++;
      line++;
    }
  }

  const header = parseRow();
  consumeLineEnding();

  const records = [];
  while (i < src.length) {
    const rowStartLine = line;
    const fields = parseRow();
    if (fields.length !== header.length) {
      throw new RangeError(
        `parseCsv: row starting on line ${rowStartLine} has ${fields.length} field(s), expected ${header.length}`
      );
    }
    const record = {};
    for (let c = 0; c < header.length; c++) {
      record[header[c]] = fields[c];
    }
    records.push(record);
    consumeLineEnding();
  }
  return records;
}

export function summarise(records, { valueKey, groupKey } = {}) {
  if (typeof valueKey !== "string" || valueKey.length === 0) {
    throw new TypeError("summarise: valueKey must be a non-empty string");
  }
  if (typeof groupKey !== "string" || groupKey.length === 0) {
    throw new TypeError("summarise: groupKey must be a non-empty string");
  }

  const out = { count: 0, total: 0, mean: 0, groups: {} };
  for (let idx = 0; idx < records.length; idx++) {
    const record = records[idx];

    let num;
    const raw = record[valueKey];
    if (raw === undefined || raw === null || raw === "") {
      num = 0; // missing key or empty cell
    } else {
      const trimmed = String(raw).trim();
      if (trimmed === "") {
        num = 0; // whitespace-only cell
      } else {
        const n = Number(trimmed);
        if (!NUMBER_RE.test(trimmed) || !Number.isFinite(n)) {
          throw new TypeError(
            `summarise: value at record ${idx} is not a finite number`
          );
        }
        num = n + 0; // +0 normalises -0
      }
    }

    const group =
      record[groupKey] === undefined || record[groupKey] === null
        ? ""
        : String(record[groupKey]);

    out.count += 1;
    out.total += num;
    if (!Object.prototype.hasOwnProperty.call(out.groups, group)) {
      out.groups[group] = { count: 0, total: 0, mean: 0 };
    }
    out.groups[group].count += 1;
    out.groups[group].total += num;
  }

  out.mean = out.count === 0 ? 0 : round(out.total / out.count);
  out.total = round(out.total);
  for (const g of Object.values(out.groups)) {
    g.mean = g.count === 0 ? 0 : round(g.total / g.count);
    g.total = round(g.total);
  }
  return out;
}

export function topGroups(summary, n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new TypeError("topGroups: n must be an integer >= 1");
  }
  const groups = (summary && summary.groups) || {};
  const entries = Object.entries(groups).map(([group, value]) => ({
    group,
    total: value.total,
  }));
  entries.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.group < b.group ? -1 : a.group > b.group ? 1 : 0;
  });
  return entries.slice(0, n);
}
