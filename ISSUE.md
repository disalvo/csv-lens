# csv-lens reads simple files and nothing else

Two things are wrong, and the public suite covers neither of them.

1. **`parseCsv` is not a CSV parser.** It splits on `\n` then on `,`. The first
   file we fed it had a quoted address with a comma in it and every column after
   that shifted one place right. Quoted newlines are worse: one field becomes two
   rows. CRLF files keep a `\r` on every last cell, and a BOM turns the first
   header key into `\ufeffteam`.
2. **`summarise` and `topGroups` do not validate anything.** `Number("12px")` is
   `NaN` and it lands in the total; `total: 0.30000000000000004` shows up in
   reports; ties in `topGroups` come back in whatever order V8 happened to keep.

The contract is README.md. Make the implementation match it.
