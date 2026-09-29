import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../../src/seo/html-escape.js';

test('escapes all five HTML-significant characters', () => {
  assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
});

test('leaves ordinary text (including accented characters) untouched', () => {
  assert.equal(escapeHtml("L'AMETLLA DE MAR SCER"), 'L&#39;AMETLLA DE MAR SCER');
  assert.equal(escapeHtml('CFS Roquetes'), 'CFS Roquetes');
});

test('escapes a team name that could otherwise break out of an attribute', () => {
  assert.equal(escapeHtml('A & B <script>'), 'A &amp; B &lt;script&gt;');
});
