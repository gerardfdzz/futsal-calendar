import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFcfStatus } from '../../../src/federation/fcf/fcf-status.mapper.js';

test('mapFcfStatus: CERRADA=0, ESTADO=0 maps to "scheduled" (the only confirmed code)', () => {
  assert.equal(mapFcfStatus({ CODACTA: '1', CERRADA: '0', ESTADO: '0' }), 'scheduled');
});

test('mapFcfStatus: an unconfirmed combination maps to "unknown", never a guess', () => {
  assert.equal(mapFcfStatus({ CODACTA: '1', CERRADA: '1', ESTADO: '0' }), 'unknown');
  assert.equal(mapFcfStatus({ CODACTA: '1', CERRADA: '0', ESTADO: '5' }), 'unknown');
  assert.equal(mapFcfStatus({ CODACTA: '1', CERRADA: '9', ESTADO: '9' }), 'unknown');
});

test('mapFcfStatus: tolerates surrounding whitespace in the raw codes', () => {
  assert.equal(mapFcfStatus({ CODACTA: '1', CERRADA: ' 0 ', ESTADO: ' 0 ' }), 'scheduled');
});

test('mapFcfStatus: logs a warning (with the CODACTA) when the combination is unknown', () => {
  const warnings: Array<{ message: string; context?: Record<string, unknown> | undefined }> = [];
  const logger = {
    info: () => {},
    warn: (message: string, context?: Record<string, unknown>) => warnings.push({ message, context }),
    error: () => {},
  };

  mapFcfStatus({ CODACTA: '4151650', CERRADA: '2', ESTADO: '3' }, logger);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.context?.['codacta'], '4151650');
});

test('mapFcfStatus: does NOT log anything for the confirmed combination', () => {
  let warnCalls = 0;
  const logger = { info: () => {}, warn: () => warnCalls++, error: () => {} };

  mapFcfStatus({ CODACTA: '1', CERRADA: '0', ESTADO: '0' }, logger);

  assert.equal(warnCalls, 0);
});
