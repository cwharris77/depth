// Hand-rolled RFC-4180 CSV parser for nflverse's CSV release assets. No dependency
// (repo's runtime dep list is deliberately small) — the files are well-formed machine
// output, so this only needs to handle quoted fields, embedded commas/quotes/newlines,
// and CRLF line endings, not the full messiness of hand-authored CSV.

export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  return dataRows.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = row[i] ?? '';
    });
    return record;
  });
}

// Streaming variant for large files (e.g. pbp_participation, ~50MB/season) — same
// RFC-4180 field handling as parseCsv, but consumes an async sequence of text chunks
// and calls `onRow` per record instead of returning a full array, so a caller can fold
// straight into an aggregate without holding every row in memory. Quote/field state
// carries across chunk boundaries (a quoted value split mid-chunk, even across a
// newline, still parses correctly) — the one gap from the whole-text parser is an
// escaped `""` split exactly at a chunk boundary, which this repo's source files never
// produce (their quoted fields hold plain comma-separated text, no literal quotes).
export async function parseCsvStream(
  chunks: AsyncIterable<string>,
  onRow: (row: Record<string, string>) => void
): Promise<void> {
  let header: string[] | null = null;
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let sawAnyField = false;

  const endRow = () => {
    row.push(field);
    field = '';
    sawAnyField = false;
    const finishedRow = row;
    row = [];
    if (finishedRow.length === 1 && finishedRow[0] === '') return; // blank line
    if (!header) {
      header = finishedRow;
      return;
    }
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = finishedRow[i] ?? '';
    });
    onRow(record);
  };

  for await (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (inQuotes) {
        if (c === '"') {
          if (chunk[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
        continue;
      }

      if (c === '"') {
        inQuotes = true;
        sawAnyField = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
        sawAnyField = true;
      } else if (c === '\r') {
        continue;
      } else if (c === '\n') {
        endRow();
      } else {
        field += c;
        sawAnyField = true;
      }
    }
  }
  if (sawAnyField || field.length > 0 || row.length > 0) {
    endRow();
  }
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let sawAnyField = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      sawAnyField = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
      sawAnyField = true;
    } else if (c === '\r') {
      continue; // swallow, \n below ends the row
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      sawAnyField = false;
    } else {
      field += c;
      sawAnyField = true;
    }
  }
  // Trailing row with no terminating newline.
  if (sawAnyField || field.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
