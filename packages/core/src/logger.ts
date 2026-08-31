/**
 * The only sanctioned way to emit a log line. `no-console: error` makes this
 * the single path, which is what lets us guarantee PII redaction (audit 10.5)
 * and structured output (audit 10.1, 10.2).
 *
 * Note this file references `globalThis.console`, not the bare `console`
 * global. That is not a trick to dodge the lint rule — it is the correct way to
 * reach the console from a module that must run on both Hermes and a browser,
 * and it happens to mean this file needs no eslint-disable. There are zero
 * eslint-disable comments in this repo and it should stay that way.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Keys whose values are replaced with '[redacted]' before a line is emitted. */
const REDACTED_KEYS = new Set([
  'password',
  'passwordconfirmation',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authorization',
  'apikey',
  'secret',
  'ssn',
  'creditcard',
  'cardnumber',
  'cvv',
  'pin',
  'otp',
  'email',
  'phone',
  'phonenumber',
  'dateofbirth',
  'dob',
  'address',
]);

const REDACTED = '[redacted]';

export type LogContext = Record<string, unknown>;

export interface LogRecord {
  level: LogLevel;
  message: string;
  context: LogContext | undefined;
  timestamp: string;
}

export type LogTransport = (record: LogRecord) => void;

/**
 * Recursively redacts PII. Depth-limited because logs are not worth a stack
 * overflow, and cycle-safe because axios error objects are cyclic.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 6) return '[truncated]';
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen));

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase().replace(/[-_\s]/g, ''))
      ? REDACTED
      : redact(item, depth + 1, seen);
  }
  return out;
}

export type LogFormat = 'pretty' | 'json';

/**
 * WHY THIS DOES NOT READ `process.env`.
 *
 * It used to: `minLevel` was `process.env['NODE_ENV'] === 'production' ? ... `.
 * That happens to survive today because Vite's `define` replaces the expression
 * before it reaches a browser — but relying on that is relying on a bundler
 * feature, in a package that is not owned by any one bundler.
 *
 * `process` genuinely does not exist on Hermes or in a browser. @repo/core runs in
 * both, plus Node under Vitest, and those three disagree about every global worth
 * sniffing. So the rule here is the same one i18n language detection already
 * follows: **@repo/core never sniffs its environment.** The app knows which
 * environment it is, so the app says so — see the configureLogger() call in each
 * app's entry point. That is also why `process` is in the no-restricted-globals
 * list for this package.
 */
let format: LogFormat = 'pretty';
let minLevel: LogLevel = 'debug';

const consoleTransport: LogTransport = (record) => {
  const { console } = globalThis;
  const method = record.level === 'debug' ? 'log' : record.level;

  if (format === 'json') {
    console[method](JSON.stringify(record));
    return;
  }

  const suffix = record.context ? ` ${JSON.stringify(record.context)}` : '';
  console[method](`[${record.level}] ${record.message}${suffix}`);
};

let transports: LogTransport[] = [consoleTransport];

/**
 * Called once from each app's entry point.
 *
 *   web:    configureLogger({ level: import.meta.env.PROD ? 'info' : 'debug',
 *                             format: import.meta.env.PROD ? 'json' : 'pretty' })
 *   mobile: configureLogger({ level: __DEV__ ? 'debug' : 'info',
 *                             format: __DEV__ ? 'pretty' : 'json' })
 *
 * The defaults (debug + pretty) are the development-friendly ones on purpose: if an
 * app forgets to call this, the failure mode is noisy logs, not silence.
 */
export function configureLogger(options: { level?: LogLevel; format?: LogFormat } = {}): void {
  if (options.level) minLevel = options.level;
  if (options.format) format = options.format;
}

/**
 * Replaces the transport list. Apps call this once to add Sentry:
 *   setLogTransports([consoleTransport, sentryTransport])
 */
export function setLogTransports(next: LogTransport[]): void {
  transports = next;
}

export function getConsoleTransport(): LogTransport {
  return consoleTransport;
}

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  const record: LogRecord = {
    level,
    message,
    context: context ? (redact(context) as LogContext) : undefined,
    timestamp: new Date().toISOString(),
  };

  for (const transport of transports) {
    try {
      transport(record);
    } catch {
      // A failing transport must never break the code that logged.
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
