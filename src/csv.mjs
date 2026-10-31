// csv-lens - first cut. The public suite is green; the contract is README.md.

const round = (n) => Math.round(n * 1e6) / 1e6;

export function parseCsv(text) {
  const lines = text.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  const header = lines.shift().split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    const record = {};
    header.forEach((key, i) => {
      record[key] = cells[i] === undefined ? "" : cells[i];
    });
    return record;
  });
}

export function summarise(records, { valueKey, groupKey } = {}) {
  const out = { count: 0, total: 0, mean: 0, groups: {} };
  for (const record of records) {
    const value = Number(record[valueKey]);
    const group = record[groupKey] === undefined ? "" : record[groupKey];
    out.count += 1;
    out.total += value;
    if (!out.groups[group]) out.groups[group] = { count: 0, total: 0, mean: 0 };
    out.groups[group].count += 1;
    out.groups[group].total += value;
  }
  out.mean = out.count === 0 ? 0 : round(out.total / out.count);
  for (const group of Object.values(out.groups)) {
    group.mean = group.count === 0 ? 0 : round(group.total / group.count);
  }
  return out;
}

export function topGroups(summary, n) {
  return Object.entries(summary.groups)
    .map(([group, value]) => ({ group, total: value.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}
