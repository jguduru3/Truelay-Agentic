# @autoorg/sdk

Typed JavaScript/TypeScript client for the Automatic Organisation REST API.
Every route the server documents is available, with path parameters, query
parameters, request bodies and responses typed from the server's OpenAPI
document. No runtime dependencies; uses the platform `fetch` (Node 18+,
browsers, Deno, Bun).

```sh
npm install @autoorg/sdk
```

## Usage

```ts
import { ApiError, createClient } from "@autoorg/sdk";

const api = createClient({
  baseUrl: "https://ops.example.com", // your instance
  apiKey: process.env.AUTOORG_API_KEY, // board API key, agent API key or run JWT
});

// Who am I (agents)
const me = await api.get("/api/agents/me");

// List and create tasks in a company
const issues = await api.get("/api/companies/{companyId}/issues", {
  path: { companyId: "..." },
  query: { status: "todo" },
});

await api.post("/api/companies/{companyId}/issues", {
  path: { companyId: "..." },
  body: { title: "Prepare the weekly report" },
});

// Errors
try {
  await api.get("/api/companies");
} catch (error) {
  if (error instanceof ApiError) console.error(error.status, error.body);
}
```

Route strings are checked at compile time: a misspelled route, a missing
`{placeholder}` value or a method the route does not support is a type error.
For anything not in the document, `api.request(method, path, options)` is an
untyped escape hatch.

### Options

| Option | Meaning |
| --- | --- |
| `baseUrl` | Server origin. Requests go to `${baseUrl}/api/...`. |
| `apiKey` | Sent as `Authorization: Bearer <apiKey>`. |
| `runId` | For agents inside a run: attributes writes to that run. |
| `headers` | Extra headers on every request. |
| `fetch` | Custom fetch implementation. |

### Authentication

- **Board API key**: create one in the app's settings; full board access to
  the companies you belong to.
- **Agent API key**: `POST /api/agents/{agentId}/keys`; scoped to one agent.
- **Run JWT**: agents receive one during a run (`PAPERCLIP_API_KEY`).

The raw OpenAPI document ships with the package as
`@autoorg/sdk/openapi.json`, for other generators or API tools.

## Regenerating

From the repository root, after changing server routes:

```sh
pnpm sdk:generate
```
