import type { paths } from "./schema.js";

/** HTTP methods the API uses. */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type PathsWith<M extends HttpMethod> = {
  [P in keyof paths]: paths[P] extends Record<M, infer Op> ? (Op extends undefined | never ? never : P) : never;
}[keyof paths];

type Operation<P extends keyof paths, M extends HttpMethod> = paths[P] extends Record<M, infer Op> ? Op : never;

type ParamsOf<Op> = Op extends { parameters: infer Params } ? Params : never;
type PathParams<Op> = ParamsOf<Op> extends { path?: infer T } ? NonNullable<T> : never;
type QueryParams<Op> = ParamsOf<Op> extends { query?: infer T } ? NonNullable<T> : never;

type JsonBody<Op> = Op extends { requestBody?: infer RB }
  ? [NonNullable<RB>] extends [never]
    ? never
    : NonNullable<RB> extends { content: { "application/json": infer B } } ? B : never
  : never;

type SuccessStatus = 200 | 201 | 202 | 203 | 204 | "2XX" | "default";
type ResponseJson<R> = R extends { content: { "application/json": infer B } } ? B : undefined;
type SuccessData<Op> = Op extends { responses: infer Rs }
  ? { [S in keyof Rs]: S extends SuccessStatus ? ResponseJson<Rs[S]> : never }[keyof Rs]
  : unknown;

type HasKeys<T> = [T] extends [never] ? false : keyof T extends never ? false : true;

/** Options for one call. `path` is required when the route has `{placeholders}`. */
export type RequestOptions<Op> =
  & (HasKeys<PathParams<Op>> extends true ? { path: PathParams<Op> } : { path?: never })
  & { query?: [QueryParams<Op>] extends [never] ? Record<string, unknown> : QueryParams<Op> }
  & ([JsonBody<Op>] extends [never] ? { body?: unknown } : { body: JsonBody<Op> })
  & {
    /** Extra headers for this call. */
    headers?: Record<string, string>;
    /** Abort the call. */
    signal?: AbortSignal;
  };

type OptionsArg<Op> = HasKeys<PathParams<Op>> extends true
  ? [options: RequestOptions<Op>]
  : [JsonBody<Op>] extends [never]
    ? [options?: RequestOptions<Op>]
    : [options: RequestOptions<Op>];

export interface ClientOptions {
  /** Server origin, e.g. "https://ops.example.com". Requests go to `${baseUrl}/api/...`. */
  baseUrl: string;
  /** Board API key, agent API key or run JWT, sent as `Authorization: Bearer <apiKey>`. */
  apiKey?: string;
  /**
   * The current agent run id. Attributes writes to that run (sent as the
   * run-id header the server expects). Agents get it as PAPERCLIP_RUN_ID.
   */
  runId?: string;
  /** Headers sent with every call. */
  headers?: Record<string, string>;
  /** A custom fetch (tests, proxies, older runtimes). Defaults to the global fetch. */
  fetch?: typeof fetch;
}

/** A non-2xx response. `body` is the parsed JSON error when the server sent one. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly method: string;
  readonly url: string;

  constructor(method: string, url: string, status: number, body: unknown) {
    const detail = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : undefined;
    super(`${method.toUpperCase()} ${url} failed with ${status}${detail ? `: ${detail}` : ""}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.method = method;
    this.url = url;
  }
}

const RUN_ID_HEADER = "X-Paperclip-Run-Id";

function fillPath(template: string, params: Record<string, unknown> | undefined): string {
  return template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined || value === null || value === "") {
      throw new TypeError(`Missing path parameter "${name}" for ${template}`);
    }
    return encodeURIComponent(String(value));
  });
}

function buildQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else if (typeof value === "object") {
      search.append(key, JSON.stringify(value));
    } else {
      search.append(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

/**
 * Create an API client. Every route in the API is available through the
 * method helpers, typed from the server's OpenAPI document:
 *
 * ```ts
 * const api = createClient({ baseUrl: "https://ops.example.com", apiKey: process.env.API_KEY });
 * const me = await api.get("/api/agents/me");
 * const issue = await api.post("/api/companies/{companyId}/issues", {
 *   path: { companyId },
 *   body: { title: "Prepare the weekly report" },
 * });
 * ```
 */
export function createClient(options: ClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("No fetch implementation available; pass one in createClient({ fetch }).");
  }

  async function request<T = unknown>(
    method: HttpMethod,
    pathTemplate: string,
    init: { path?: Record<string, unknown>; query?: Record<string, unknown>; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal } = {},
  ): Promise<T> {
    const url = `${baseUrl}${fillPath(pathTemplate, init.path)}${buildQuery(init.query)}`;
    const headers: Record<string, string> = { Accept: "application/json", ...options.headers, ...init.headers };
    if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;
    if (options.runId) headers[RUN_ID_HEADER] = options.runId;
    let body: BodyInit | undefined;
    if (init.body !== undefined) {
      if (typeof FormData !== "undefined" && init.body instanceof FormData) {
        body = init.body;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(init.body);
      }
    }
    const response = await fetchImpl(url, { method: method.toUpperCase(), headers, body, signal: init.signal });
    const data = await readBody(response);
    if (!response.ok) throw new ApiError(method, url, response.status, data);
    return data as T;
  }

  function method<M extends HttpMethod>(name: M) {
    return <P extends PathsWith<M>>(path: P, ...args: OptionsArg<Operation<P, M>>): Promise<SuccessData<Operation<P, M>>> =>
      request(name, path as string, (args[0] ?? {}) as Record<string, never>);
  }

  return {
    get: method("get"),
    post: method("post"),
    put: method("put"),
    patch: method("patch"),
    delete: method("delete"),
    /** Untyped escape hatch for routes not in the published document. */
    request,
  };
}

export type ApiClient = ReturnType<typeof createClient>;
