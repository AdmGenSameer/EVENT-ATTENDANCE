import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

export const parseCsv = (csvText: string): CsvRow[] => {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  return records.map((row) => {
    const normalized: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim()] = value?.trim?.() ?? "";
    }
    return normalized;
  });
};
