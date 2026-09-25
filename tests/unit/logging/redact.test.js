const { redact } = require('../../../src/logging/redact');

describe('logging/redact', () => {
  it('redacts known sensitive keys at any depth', () => {
    const input = { password: 'secret', nested: { token: 'abc', ok: 'value' } };
    expect(redact(input)).toEqual({
      password: '[REDACTED]',
      nested: { token: '[REDACTED]', ok: 'value' },
    });
  });

  it('matches sensitive key names case-insensitively', () => {
    expect(redact({ Authorization: 'Bearer xyz' })).toEqual({ Authorization: '[REDACTED]' });
  });

  it('redacts values inside arrays', () => {
    expect(redact([{ secret: 'x' }, { ok: 'y' }])).toEqual([
      { secret: '[REDACTED]' },
      { ok: 'y' },
    ]);
  });

  it('handles circular references without throwing', () => {
    const obj = { name: 'a' };
    obj.self = obj;
    expect(() => redact(obj)).not.toThrow();
    expect(redact(obj).self).toBe('[Circular]');
  });

  it('passes through primitives and null unchanged', () => {
    expect(redact('hello')).toBe('hello');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });
});
