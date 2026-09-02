export const CRLF = '\r\n';

const MAX_OCTETS_PER_LINE = 75;

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= MAX_OCTETS_PER_LINE) {
    return line;
  }

  const decoder = new TextDecoder('utf-8');
  const chunks: string[] = [];
  let start = 0;
  let budget = MAX_OCTETS_PER_LINE;

  while (start < bytes.length) {
    let end = Math.min(start + budget, bytes.length);
    while (end > start && isUtf8ContinuationByte(bytes[end])) {
      end--;
    }
    chunks.push(decoder.decode(bytes.slice(start, end)));
    start = end;
    budget = MAX_OCTETS_PER_LINE - 1;
  }

  return chunks.join(CRLF + ' ');
}

function isUtf8ContinuationByte(byte: number | undefined): boolean {
  return byte !== undefined && (byte & 0xc0) === 0x80;
}
