import type { LessonTable, LessonTip, LessonQuickRefItem } from '@/types/vocab';

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

const MD_SEPARATOR_RE = /^\|?[\s:|-]+\|?$/;

export function parseTable(raw: string): LessonTable {
  const lines = raw.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const isMarkdown = lines[0].trim().startsWith('|');
  if (isMarkdown) {
    const headers = splitMarkdownRow(lines[0]);
    const bodyLines = MD_SEPARATOR_RE.test(lines[1] ?? '') ? lines.slice(2) : lines.slice(1);
    const rows = bodyLines.map((l) => splitMarkdownRow(l));
    return { headers, rows };
  }

  // Excel / Sheets paste: tab-separated
  const [headerLine, ...bodyLines] = lines;
  const headers = headerLine.split('\t').map((c) => c.trim());
  const rows = bodyLines.map((l) => l.split('\t').map((c) => c.trim()));
  return { headers, rows };
}

export function stringifyTable(table: LessonTable): string {
  if (table.headers.length === 0) return '';
  const headerLine = `| ${table.headers.join(' | ')} |`;
  const sepLine = `| ${table.headers.map(() => '---').join(' | ')} |`;
  const rowLines = table.rows.map((r) => `| ${r.join(' | ')} |`);
  return [headerLine, sepLine, ...rowLines].join('\n');
}

export function parseQuickRef(raw: string): LessonQuickRefItem[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+-\s+|\s*:\s*/);
      const term = (parts[0] ?? '').trim();
      const category = (parts.slice(1).join(' - ') ?? '').trim();
      return { term, category };
    })
    .filter((item) => item.term);
}

export function stringifyQuickRef(items: LessonQuickRefItem[]): string {
  return items.map((i) => `${i.term} - ${i.category}`).join('\n');
}

export function parseTips(raw: string): LessonTip[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (/^##\s+/m.test(trimmed)) {
    return trimmed
      .split(/\n(?=##\s+)/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split('\n');
        const title = lines[0].replace(/^##\s+/, '').trim();
        const body = lines.slice(1).join('\n').trim();
        return { title, body };
      });
  }

  return trimmed
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      return { title, body };
    })
    .filter((t) => t.title);
}

export function stringifyTips(tips: LessonTip[]): string {
  return tips.map((t) => `## ${t.title}\n${t.body}`).join('\n\n');
}
