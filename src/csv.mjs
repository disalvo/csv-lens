// csv-lens - follows the README contract.

const round = (n) => Math.round(n * 1e6) / 1e6;

// Strict decimal parser: only canonical decimal notation (optionally signed,
// optionally with a decimal point, optionally with a scientific exponent) is a
// number. This rejects "12px", "1e", "0x10" and "NaN" as required.
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseCsv(text) {
  // A UTF-8 BOM at the very start is stripped and never becomes part of the
  // first key.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Empty text, or text that is only whitespace, has no header and no rows.
  if (text.trim() === "") {
    return [];
  }

  const rows = [];
  let field = "";
  let fields = [];
  let inQuotes = false;
  let line = 1; // 1-based physical line number
  let rowStartLine = 1; // line on which the current row's first field begins

  const endRecord = () => {
    fields.push(field);
    field = "";
    rows.push({ fields, startLine: rowStartLine });
    fields = [];
  };

  for (let i = 0; i < text.length; ) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          // A doubled quote is one quote character.
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        // Commas, newlines and CRLFs are literal inside quotes.
        field += c;
        if (c === "\n") line += 1;
        i += 1;
      }
    } else if (c === '"') {
      inQuotes = true;
      i += 1;
    } else if (c === ",") {
      fields.push(field);
      field = "";
      i += 1;
    } else if (c === "\r") {
      if (text[i + 1] === "\n") {
        // CRLF line ending.
        endRecord();
        i += 2;
        line += 1;
        rowStartLine = line;
      } else {
        field += c;
        i += 1;
      }
    } else if (c === "\n") {
      // LF line ending.
      endRecord();
      i += 1;
      line += 1;
      rowStartLine = line;
    } else {
      field += c;
      i += 1;
    }
  }

  // Flush a final record that has no terminating newline.
  if (field !== "" || fields.length > 0) {
    fields.push(field);
    rows.push({ fields, startLine: rowStartLine });
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].fields;
  const headerCount = header.length;

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.fields.length !== headerCount) {
      throw new RangeError(
        `row starting on line ${row.startLine} has ${row.fields.length} fields, expected ${headerCount}`
      );
    }
    const record = {};
    for (let j = 0; j < headerCount; j++) {
      record[header[j]] = row.fields[j];
    }
    records.push(record);
  }
  return records;
}

function valueAsNumber(cell, key, index) {
  if (cell === undefined || cell === null) {
    return 0;
  }
  if (typeof cell !== "string") {
    cell = String(cell);
  }
  const trimmed = cell.trim();
  if (trimmed === "") {
    return 0;
  }
  const n = Number(trimmed);
  if (!DECIMAL.test(trimmed) || !Number.isFinite(n)) {
    throw new TypeError(
      `value for "${key}" at record index ${index} is not a finite number`
    );
  }
  return n;
}

export function summarise(records, { valueKey, groupKey } = {}) {
  if (typeof valueKey !== "string" || valueKey.length === 0) {
    throw new TypeError("valueKey must be a non-empty string");
  }
  if (typeof groupKey !== "string" || groupKey.length === 0) {
    throw new TypeError("groupKey must be a non-empty string");
  }

  let count = 0;
  let total = 0;
  const groupMap = new Map();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const value = valueAsNumber(record[valueKey], valueKey, i);
    const group = record[groupKey] ?? "";

    count += 1;
    total += value;

    let entry = groupMap.get(group);
    if (entry === undefined) {
      entry = { count: 0, total: 0 };
      groupMap.set(group, entry);
    }
    entry.count += 1;
    entry.total += value;
  }

  const groups = {};
  for (const [group, entry] of groupMap) {
    Object.defineProperty(groups, group, {
      value: {
        count: entry.count,
        total: round(entry.total),
        mean: entry.count === 0 ? 0 : round(entry.total / entry.count),
      },
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  return {
    count,
    total: round(total),
    mean: count === 0 ? 0 : round(total / count),
    groups,
  };
}

export function topGroups(summary, n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new TypeError("n must be an integer >= 1");
  }
  const groups = summary && summary.groups;
  if (!groups) {
    return [];
  }
  return Object.entries(groups)
    .map(([group, value]) => ({ group, total: value.total }))
    .sort((a, b) => {
      if (a.total !== b.total) {
        return b.total - a.total;
      }
      if (a.group < b.group) {
        return -1;
      }
      if (a.group > b.group) {
        return 1;
      }
      return 0;
    })
    .slice(0, n);
}
