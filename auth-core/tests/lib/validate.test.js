const { normalizeField } = require('../../src/lib/validate');

describe('normalizeField', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeField('  alice  ')).toBe('alice');
  });

  it('treats whitespace-only input as absent', () => {
    expect(normalizeField('   ')).toBeUndefined();
  });

  it('treats non-string input as absent', () => {
    expect(normalizeField(undefined)).toBeUndefined();
    expect(normalizeField(null)).toBeUndefined();
    expect(normalizeField(42)).toBeUndefined();
  });

  it('passes through a normal string unchanged', () => {
    expect(normalizeField('alice')).toBe('alice');
  });
});
