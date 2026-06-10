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
});
