import { describe, expect, it, vi } from "vitest";
import { ApiError, createClient } from "./index.js";

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }));
}

describe("createClient", () => {
  it("sends auth, run id and JSON body to the filled-in path", async () => {
    const fetch = fakeFetch(201, { id: "issue-1" });
    const api = createClient({ baseUrl: "https://ops.example.com/", apiKey: "key-123", runId: "run-9", fetch });

    const created = await api.post("/api/companies/{companyId}/issues", {
      path: { companyId: "co 1" },
      body: { title: "Weekly report" },
    });

    expect(created).toEqual({ id: "issue-1" });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://ops.example.com/api/companies/co%201/issues");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer key-123",
      "X-Paperclip-Run-Id": "run-9",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe(JSON.stringify({ title: "Weekly report" }));
  });

  it("serialises query parameters and skips empty ones", async () => {
    const fetch = fakeFetch(200, []);
    const api = createClient({ baseUrl: "https://ops.example.com", fetch });
    await api.request("get", "/api/companies/{companyId}/issues", {
      path: { companyId: "c1" },
      query: { status: ["todo", "in_progress"], q: undefined, limit: 5 },
    });
    expect(fetch.mock.calls[0]![0]).toBe("https://ops.example.com/api/companies/c1/issues?status=todo&status=in_progress&limit=5");
  });

  it("throws ApiError with the parsed body on failure", async () => {
    const api = createClient({ baseUrl: "https://ops.example.com", fetch: fakeFetch(403, { error: "Forbidden" }) });
    const failure = await api.get("/api/agents/me").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 403, body: { error: "Forbidden" } });
    expect((failure as Error).message).toContain("403: Forbidden");
  });

  it("refuses to call a route with a missing path parameter", async () => {
    const api = createClient({ baseUrl: "https://ops.example.com", fetch: fakeFetch(200, {}) });
    await expect(api.request("get", "/api/companies/{companyId}/issues", {})).rejects.toThrow('Missing path parameter "companyId"');
  });

  it("rejects unknown routes and missing path params at compile time", () => {
    const api = createClient({ baseUrl: "https://ops.example.com", fetch: fakeFetch(200, {}) });
    const typeOnly = () => {
      // @ts-expect-error not a route in the API document
      void api.get("/api/not-a-route");
      // @ts-expect-error companyId is required for this route
      void api.get("/api/companies/{companyId}/issues");
      // @ts-expect-error GET /api/agents/me exists but DELETE does not
      void api.delete("/api/agents/me");
    };
    expect(typeof typeOnly).toBe("function");
  });
});
