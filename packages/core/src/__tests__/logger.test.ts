import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type LogRecord,
  configureLogger,
  getConsoleTransport,
  logger,
  redact,
  setLogLevel,
  setLogTransports,
} from '../logger';

function captureLogs(): { records: LogRecord[] } {
  const records: LogRecord[] = [];
  setLogTransports([(record) => records.push(record)]);
  return { records };
}

describe('redact', () => {
  it('replaces PII keys regardless of casing or separators', () => {
    expect(
      redact({ password: 'hunter2', accessToken: 'abc', access_token: 'abc', EMAIL: 'a@b.c' }),
    ).toEqual({
      password: '[redacted]',
      accessToken: '[redacted]',
      access_token: '[redacted]',
      EMAIL: '[redacted]',
    });
  });

  it('leaves non-PII values alone', () => {
    expect(redact({ postId: 'post-1', count: 3, ok: true })).toEqual({
      postId: 'post-1',
      count: 3,
      ok: true,
    });
  });

  it('redacts inside nested objects and arrays', () => {
    expect(redact({ users: [{ name: 'Ada', email: 'anisha@example.com' }] })).toEqual({
      users: [{ name: 'Ada', email: '[redacted]' }],
    });
  });

  it('survives circular references', () => {
    // axios errors are cyclic, and they are exactly what gets logged on failure.
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic['self'] = cyclic;

    expect(() => redact(cyclic)).not.toThrow();
    expect(redact(cyclic)).toEqual({ name: 'root', self: '[circular]' });
  });

  it('truncates beyond a sane depth instead of recursing forever', () => {
    let deep: Record<string, unknown> = { value: 'leaf' };
    for (let i = 0; i < 12; i += 1) deep = { nested: deep };

    expect(JSON.stringify(redact(deep))).toContain('[truncated]');
  });
});

describe('logger', () => {
  it('redacts context before it reaches a transport', () => {
    const { records } = captureLogs();

    logger.info('signed in', { email: 'anisha@example.com', userId: 'user-1' });

    expect(records).toHaveLength(1);
    expect(records[0]?.context).toEqual({ email: '[redacted]', userId: 'user-1' });
  });

  it('honours the minimum level', () => {
    const { records } = captureLogs();
    setLogLevel('warn');

    logger.debug('nope');
    logger.info('nope');
    logger.warn('yes');
    logger.error('yes');

    expect(records.map((record) => record.level)).toEqual(['warn', 'error']);
    setLogLevel('debug');
  });

  it('stamps an ISO timestamp', () => {
    const { records } = captureLogs();

    logger.info('x');

    expect(records[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('never lets a broken transport break the caller', () => {
    const good = vi.fn();
    setLogTransports([
      () => {
        throw new Error('transport exploded');
      },
      good,
    ]);

    expect(() => logger.error('still fine')).not.toThrow();
    // A failing transport must not stop the remaining ones.
    expect(good).toHaveBeenCalledTimes(1);
  });
});

describe('configureLogger', () => {
  /**
   * These cover the console transport itself, which is the part an app actually
   * sees. @repo/core deliberately does not detect its own environment — there is no
   * `process` on Hermes or in a browser — so an app calls configureLogger() from
   * `import.meta.env.PROD` on web and `__DEV__` on native. If that contract breaks,
   * either logs vanish in development or unformatted lines ship to production.
   */
  function captureConsole() {
    const lines: { method: string; text: string }[] = [];
    for (const method of ['log', 'info', 'warn', 'error'] as const) {
      vi.spyOn(globalThis.console, method).mockImplementation((...args: unknown[]) => {
        lines.push({ method, text: args.map(String).join(' ') });
      });
    }
    return lines;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore the module defaults; these are module-level singletons.
    configureLogger({ level: 'debug', format: 'pretty' });
    setLogTransports([getConsoleTransport()]);
  });

  it('defaults to development-friendly settings', () => {
    // Silence, not noise, is the dangerous failure mode: an app that forgets to
    // call configureLogger() should still print everything.
    const lines = captureConsole();
    setLogTransports([getConsoleTransport()]);

    logger.debug('visible by default');

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe('[debug] visible by default');
  });

  it('prints pretty lines with the level prefix and context', () => {
    const lines = captureConsole();
    setLogTransports([getConsoleTransport()]);
    configureLogger({ format: 'pretty' });

    logger.warn('disk almost full', { freeMb: 12 });

    expect(lines[0]).toEqual({ method: 'warn', text: '[warn] disk almost full {"freeMb":12}' });
  });

  it('prints one JSON object per line when asked, with PII already redacted', () => {
    const lines = captureConsole();
    setLogTransports([getConsoleTransport()]);
    configureLogger({ format: 'json' });

    logger.error('login failed', { email: 'anisha@example.com', attempt: 2 });

    const parsed = JSON.parse(lines[0]?.text ?? '{}') as Record<string, unknown>;
    expect(parsed['level']).toBe('error');
    expect(parsed['message']).toBe('login failed');
    expect(parsed['context']).toEqual({ email: '[redacted]', attempt: 2 });
  });

  it('routes debug to console.log, since console.debug is hidden by default', () => {
    const lines = captureConsole();
    setLogTransports([getConsoleTransport()]);

    logger.debug('trace me');

    // Chrome hides console.debug behind the "Verbose" filter, which is exactly the
    // "why can't I see my logs" trap this mapping exists to avoid.
    expect(lines[0]?.method).toBe('log');
  });

  it('applies a level set through configureLogger', () => {
    const lines = captureConsole();
    setLogTransports([getConsoleTransport()]);
    configureLogger({ level: 'info' });

    logger.debug('dropped');
    logger.info('kept');

    expect(lines.map((line) => line.text)).toEqual(['[info] kept']);
  });

  it('leaves the other setting alone when only one is passed', () => {
    const lines = captureConsole();
    setLogTransports([getConsoleTransport()]);
    configureLogger({ format: 'json' });
    configureLogger({ level: 'debug' });

    logger.debug('still json');

    // A block body, not a concise one: returning JSON.parse's `any` out of the
    // arrow trips no-unsafe-return.
    expect(() => {
      JSON.parse(lines[0]?.text ?? '');
    }).not.toThrow();
  });
});
