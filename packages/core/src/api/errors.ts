import { AxiosError } from 'axios';
import { ZodError, type ZodType, type z } from 'zod';

/**
 * One error shape for the whole app, so UI never has to know whether a failure
 * came from the network, the server, or a schema mismatch (audit item 9.1).
 */
export type ApiErrorKind =
  /** No response at all: offline, DNS, timeout, CORS. */
  | 'network'
  /** 401/403. */
  | 'unauthorized'
  /** 404. */
  | 'notFound'
  /** 422 or a 400 with field errors. */
  | 'validation'
  /** Any other 4xx. */
  | 'client'
  /** Any 5xx. */
  | 'server'
  /** The server replied 2xx but the body did not match our zod schema. */
  | 'schema'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  /** Field-level messages, keyed by field name, when the server sends them. */
  readonly fieldErrors: Record<string, string[]> | undefined;
  override readonly cause: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: {
      status?: number | undefined;
      fieldErrors?: Record<string, string[]> | undefined;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.fieldErrors = options.fieldErrors;
    this.cause = options.cause;
  }

  /** True when retrying the same request could plausibly succeed. */
  get isRetryable(): boolean {
    return this.kind === 'network' || this.kind === 'server';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'notFound';
  if (status === 422 || status === 400) return 'validation';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'unknown';
}

/**
 * Both error shapes this app can receive, in one interface.
 *
 * The API speaks ASP.NET Core, so failures come back as RFC 7807
 * `ProblemDetails` — `{ type, title, status, detail, instance }` — and validation
 * failures as `HttpValidationProblemDetails`, which adds
 * `errors: { field: string[] }`. That `errors` map is already exactly the shape
 * `fieldErrors` wants, which is why readFieldErrors needs no special case.
 *
 * `message` is kept for the mock server and any non-.NET endpoint.
 */
interface ServerErrorBody {
  message?: unknown;
  /** ProblemDetails: the specific explanation ("Email already registered"). */
  detail?: unknown;
  /** ProblemDetails: the generic one ("Bad Request"). Used only if detail is absent. */
  title?: unknown;
  errors?: unknown;
}

function readFieldErrors(body: ServerErrorBody): Record<string, string[]> | undefined {
  if (typeof body.errors !== 'object' || body.errors === null) return undefined;

  const out: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(body.errors as Record<string, unknown>)) {
    if (Array.isArray(value)) out[field] = value.map(String);
    else if (typeof value === 'string') out[field] = [value];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Normalises anything thrown inside the api layer into an ApiError.
 *
 * Every function in a feature's api.ts wraps its call in this, so callers —
 * and therefore every hook and every screen — only ever see ApiError.
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first && first.path.length > 0 ? first.path.join('.') : '<root>';
    return new ApiError(
      'schema',
      `The API returned data this app does not understand (at "${path}"). ` +
        `Either the backend contract changed or the zod schema is wrong.`,
      { cause: error },
    );
  }

  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError('network', 'Could not reach the server. Check your connection.', {
        cause: error,
      });
    }

    // axios types response.data as `any`, so it is narrowed to `unknown` here
    // before anything reads it. This is the whole reason no-unsafe-assignment is
    // an error in this repo: an `any` from a library boundary spreads silently.
    const status: number = error.response.status;
    const data: unknown = error.response.data;
    const body: ServerErrorBody = typeof data === 'object' && data !== null ? data : {};
    // Order matters: `detail` before `title`, because ProblemDetails puts the
    // useful sentence in `detail` and a generic status phrase in `title`.
    // Preferring title would turn "That email is already registered" into
    // "Bad Request" on every validation failure.
    const serverMessage = [body.message, body.detail, body.title].find(
      (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
    );

    return new ApiError(kindForStatus(status), serverMessage ?? `Request failed (${status}).`, {
      status,
      fieldErrors: readFieldErrors(body),
      cause: error,
    });
  }

  return new ApiError('unknown', error instanceof Error ? error.message : 'Unexpected error.', {
    cause: error,
  });
}

/** Turns zod issues into the same fieldErrors shape the server sends. */
export function zodToFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Validates a REQUEST body before it goes near the network.
 *
 * This is distinct from parsing a RESPONSE. A bad request is the user's input
 * being wrong (kind: 'validation', with fieldErrors a form can display); a bad
 * response is the backend contract having changed (kind: 'schema', which is a
 * bug report, not something a user can fix). Collapsing the two would show
 * "the API returned data this app does not understand" to someone who simply
 * typed a two-character title.
 */
export function parseRequestBody<TSchema extends ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw new ApiError('validation', 'Some of the details you entered are not valid.', {
    fieldErrors: zodToFieldErrors(result.error),
    cause: result.error,
  });
}
