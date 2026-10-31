import { execSync } from "node:child_process";

// Build a 50k-row fixture with quotes, commas inside quotes and CRLF every 3rd line.
export function fixture(rows = 50000) {
  const parts = ["team,price,note"];
  for (let i = 0; i < rows; i++) {
    const team = ["alpha", "beta", "gamma", "delta"][i % 4];
    const note = i % 3 === 0 ? `"batch, ${i}""ok"""` : `note${i}`;
    parts.push(`${team},${(i % 977) + 0.5},${note}`);
  }
  return parts.join("\r\n") + "\r\n";
}

export function bench(parseCsv, summarise, text, rounds = 5) {
  const times = [];
  let rows = 0;
  for (let r = 0; r < rounds; r++) {
    const t0 = process.hrtime.bigint();
    const records = parseCsv(text);
    const summary = summarise(records, { valueKey: "price", groupKey: "team" });
    const t1 = process.hrtime.bigint();
    rows = summary.count;
    times.push(Number(t1 - t0) / 1e6);
  }
  times.sort((a, b) => a - b);
  return { median_ms: Math.round(times[Math.floor(times.length / 2)]), rows };
}
