import { describe, expect, it } from 'vitest';
import { redactConsoleLogMessage } from '../src/widget/console-log-redaction';

describe('console log redaction', () => {
  it('redacts key/value and JSON-shaped secret fields', () => {
    expect(redactConsoleLogMessage('token=abc123')).toBe('token=[redacted]');
    expect(
      redactConsoleLogMessage('{"token":"abc123","password":"hunter2","cookie":"sid=short"}')
    ).toBe('{"token":"[redacted]","password":"[redacted]","cookie":"[redacted]"}');
  });

  it('redacts quoted secret values containing common delimiters', () => {
    expect(redactConsoleLogMessage('{"password":"correct horse"}')).toBe(
      '{"password":"[redacted]"}'
    );
    expect(redactConsoleLogMessage('{"cookie":"sid=short; theme=dark"}')).toBe(
      '{"cookie":"[redacted]"}'
    );
    expect(redactConsoleLogMessage('token="abc,123&def"}')).toBe('token="[redacted]"}');
    expect(redactConsoleLogMessage('password="abc\\"def"')).toBe('password="[redacted]"');
  });

  it('redacts structured values under secret keys', () => {
    expect(redactConsoleLogMessage('{"password":["hunter2"]}')).toBe('{"password":[redacted]}');
    expect(redactConsoleLogMessage('{"cookie":["sid=short"]}')).toBe('{"cookie":[redacted]}');
    expect(redactConsoleLogMessage('retry {"password":{"value":"hunter2"}} done')).toBe(
      'retry {"password":[redacted]} done'
    );
    expect(redactConsoleLogMessage('{"password":["hunter2"],"message":"kept"}')).toBe(
      '{"password":[redacted],"message":"kept"}'
    );
  });

  it('redacts unterminated quoted secret values', () => {
    expect(redactConsoleLogMessage('password="hunter2')).toBe('password="[redacted]');
    expect(redactConsoleLogMessage('token="short,secret')).toBe('token="[redacted]');
    expect(redactConsoleLogMessage('{"password":"hunter2}')).toBe('{"password":"[redacted]');
    expect(redactConsoleLogMessage('password="hunter2\nstack line')).toBe(
      'password="[redacted]\nstack line'
    );
    expect(redactConsoleLogMessage('password="abc\\"def')).toBe('password="[redacted]');
    expect(redactConsoleLogMessage('password="abc\\"def\nstack line')).toBe(
      'password="[redacted]\nstack line'
    );
  });

  it('redacts bearer tokens without damaging the authorization prefix', () => {
    expect(redactConsoleLogMessage('Authorization: Bearer abc.def.ghi')).toBe(
      'Authorization: Bearer [redacted]'
    );
  });

  it('redacts email addresses', () => {
    const result = redactConsoleLogMessage('mario.rossi@example.com');
    expect(result).toBe('[redacted-email]');
    expect(result).not.toContain('mario.rossi');
    expect(result).not.toContain('example.com');
  });

  it('redacts only the email within a larger string', () => {
    const result = redactConsoleLogMessage('contact mario.rossi@example.com for details');
    expect(result).toBe('contact [redacted-email] for details');
    expect(result).not.toContain('mario.rossi@example.com');
  });

  it('redacts Italian codice fiscale', () => {
    const result = redactConsoleLogMessage('CF: RSSMRA85T10A562S');
    expect(result).toBe('CF: [redacted-cf]');
    expect(result).not.toContain('RSSMRA85T10A562S');
  });

  it('leaves clean messages unchanged', () => {
    expect(redactConsoleLogMessage('just a normal log line with no secrets')).toBe(
      'just a normal log line with no secrets'
    );
  });
});
