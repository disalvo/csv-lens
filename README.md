# csv-lens

Read a CSV file and answer three questions about a column: how many rows, what
they add up to, and which groups are the biggest. The contract below is
authoritative; the implementation in `src/csv.mjs` is not.

## `parseCsv(text)`

Takes the file's whole text and returns an array of objects, one per data row,
keyed by the header cells.

1. The first row is the header. Keys are the header cells exactly as written
   (no trimming).
2. RFC 4180 quoting: a field may be wrapped in double quotes. Inside quotes a
   comma, a newline and a doubled `""` are literal; a doubled quote is one
   quote character. A quoted field may span several physical lines.
3. Line endings may be LF or CRLF, mixed in the same file. A UTF-8 BOM at the
   very start of the text is stripped and never becomes part of the first key.
4. Empty text, or text that is only whitespace, returns `[]` - no header, no
   rows.
5. Every data row must have exactly as many fields as the header. A row with a
   different count throws a `RangeError` whose message contains the 1-based
   physical line number on which the row starts.
6. Values are always strings. Nothing is coerced, trimmed or type-detected here.

## `summarise(records, { valueKey, groupKey })`

1. Both keys must be non-empty strings, otherwise `TypeError`.
2. The `valueKey` cell of every record is read as a number: an empty cell, or a
   record without that key, counts as `0`. Anything else that is not a finite
   number after trimming (`"12px"`, `"1e"`, `"0x10"`, `"NaN"`) throws a
   `TypeError` naming the 0-based record index.
3. Returns `{ count, total, mean, groups }` where `groups` maps the raw
   `groupKey` string (an empty string when the cell is missing) to
   `{ count, total, mean }`. `total` and `mean` are rounded to 6 decimal places
   to keep float noise out of the output. Empty input returns
   `{ count: 0, total: 0, mean: 0, groups: {} }`.

## `topGroups(summary, n)`

1. `n` must be an integer >= 1, otherwise `TypeError`.
2. Returns at most `n` entries as `[{ group, total }]`, sorted by `total`
   descending and, when two totals are equal, by `group` ascending.
3. An empty summary returns `[]`.

## Example

```js
const rows = parseCsv("team,price\na,10\nb,5\na,2.5\n");
summarise(rows, { valueKey: "price", groupKey: "team" });
// { count: 3, total: 17.5, mean: 5.833333,
//   groups: { a: { count: 2, total: 12.5, mean: 6.25 },
//             b: { count: 1, total: 5, mean: 5 } } }
topGroups(summarise(rows, { valueKey: "price", groupKey: "team" }), 1);
// [ { group: "a", total: 12.5 } ]
```
