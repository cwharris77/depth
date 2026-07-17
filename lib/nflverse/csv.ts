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
