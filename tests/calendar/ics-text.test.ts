import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeIcsText, foldLine } from '../../src/calendar/ics-text.js';

test('escapeIcsText: escapes backslash, semicolon, comma and newlines per RFC 5545', () => {
  assert.equal(escapeIcsText('back\\slash'), 'back\\\\slash');
  assert.equal(escapeIcsText('a;b'), 'a\\;b');
  assert.equal(escapeIcsText('a,b'), 'a\\,b');
  assert.equal(escapeIcsText('line1\nline2'), 'line1\\nline2');
  assert.equal(escapeIcsText('line1\r\nline2'), 'line1\\nline2');
});

test('escapeIcsText: leaves apostrophes untouched (not a special character in RFC 5545)', () => {
  assert.equal(escapeIcsText("L'Ametlla de Mar"), "L'Ametlla de Mar");
});

test('escapeIcsText: escapes backslashes before other characters, so nothing gets double-escaped', () => {
  assert.equal(escapeIcsText('a;b\\c,d'), 'a\\;b\\\\c\\,d');
});

test('escapeIcsText: combines multiple special characters correctly, matching a real venue name', () => {
  const input = "Pavelló Municipal d'Esports; Zona Nord, Camp 2";
  assert.equal(escapeIcsText(input), "Pavelló Municipal d'Esports\\; Zona Nord\\, Camp 2");
});

test('foldLine: leaves a line at or under 75 octets unchanged', () => {
  const line = 'SUMMARY:' + 'a'.repeat(67);
  assert.equal(new TextEncoder().encode(line).length, 75);
  assert.equal(foldLine(line), line);
});

test('foldLine: folds a line over 75 octets, with each physical line within budget', () => {
  const line = 'SUMMARY:' + 'a'.repeat(100);
  const folded = foldLine(line);
  const physicalLines = folded.split('\r\n');

  assert.ok(physicalLines.length > 1);
  for (const [index, physicalLine] of physicalLines.entries()) {
    const byteLength = new TextEncoder().encode(physicalLine).length;
    assert.ok(byteLength <= 75, `physical line ${index} is ${byteLength} octets`);
    if (index > 0) {
      assert.equal(physicalLine[0], ' ', 'continuation lines must start with a single space');
    }
  }
});

test('foldLine: unfolding (strip CRLF + leading space) reconstructs the exact original line', () => {
  const line = 'DESCRIPTION:' + 'lorem ipsum dolor sit amet '.repeat(10);
  const folded = foldLine(line);
  const unfolded = folded
    .split('\r\n')
    .map((physicalLine, index) => (index === 0 ? physicalLine : physicalLine.slice(1)))
    .join('');
  assert.equal(unfolded, line);
});

test('foldLine: never splits a multi-byte UTF-8 character across a fold boundary', () => {
  const longValue = 'é'.repeat(60);
  const line = `LOCATION:${longValue}`;
  const folded = foldLine(line);

  const foldedBytes = new TextEncoder().encode(folded);
  const foldMarker = new TextEncoder().encode('\r\n ');
  const segments: Uint8Array[] = [];
  let start = 0;

  for (let i = 0; i <= foldedBytes.length - foldMarker.length; i++) {
    let matches = true;
    for (let j = 0; j < foldMarker.length; j++) {
      if (foldedBytes[i + j] !== foldMarker[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      segments.push(foldedBytes.slice(start, i));
      start = i + foldMarker.length;
      i += foldMarker.length - 1;
    }
  }
  segments.push(foldedBytes.slice(start));

  assert.ok(segments.length > 1, 'expected the line to actually fold');

  const strictDecoder = new TextDecoder('utf-8', { fatal: true });
  const decodedSegments: string[] = [];
  for (const segment of segments) {
    assert.doesNotThrow(() => decodedSegments.push(strictDecoder.decode(segment)));
  }

  assert.equal(decodedSegments.join(''), line);
});

test('foldLine: handles a line requiring several fold points', () => {
  const line = 'DESCRIPTION:' + 'x'.repeat(300);
  const folded = foldLine(line);
  const physicalLines = folded.split('\r\n');
  assert.ok(physicalLines.length >= 4);
  for (const physicalLine of physicalLines) {
    assert.ok(new TextEncoder().encode(physicalLine).length <= 75);
  }
});
